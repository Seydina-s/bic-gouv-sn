"""Reads contents aloud once, for the app to play (workflow of 03/10/2026).

French: Piper, voice fr_FR-upmc-medium, speaker Jessica (dataset CC BY-SA 4.0).
Wolof: Adia_TTS by CONCREE (Apache 2.0).

Usage: python synthesize.py <jobs.json> <voices-dir>
jobs.json holds [{"id", "lang": "fr" | "wo", "pieces": [text, ...], "out": "file.mp3"}].
One JSON line per job on stdout: {"id", "ok": true, "durationMs", "bytes", "voiceId"}
or {"id", "ok": false, "error"}. Models load once, only for the languages asked.
"""

import hashlib
import json
import sys
import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf

from chunks import sentences

PIPER_VOICE = "fr_FR-upmc-medium"
PIPER_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/fr/fr_FR/upmc/medium/"
# The files checked once (03/10/2026): any other content is refused.
PIPER_SHA256 = {
    f"{PIPER_VOICE}.onnx": "9abb3800c199148897a9ed64e100d224f3de83579f100044174ad19418f1786f",
    f"{PIPER_VOICE}.onnx.json": "e8636ec15dfd5d72db37a02cb5320a20f2b8d339f2a0e4337da64c58a33a5868",
}
JESSICA = 0
ADIA = "CONCREE/Adia_TTS"
# Pinned revision, weights in safetensors only: transformers stays at 4.46.1 because
# parler-tts requires it, and its known flaws are in loading untrusted (pickled)
# checkpoints. A pinned, verified revision in safetensors never runs such code.
ADIA_REVISION = "1a4ba9291efc3f40418ecace15ddb8bd8431d376"
ADIA_DESCRIPTION = "A clear and educational voice, with a flow adapted to learning"
# Silence between paragraphs, and between sentences read one by one (Wolof).
PARAGRAPH_PAUSE_S = 0.6
SENTENCE_PAUSE_S = 0.25


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for block in iter(lambda: file.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def _piper_files(voices: Path) -> Path:
    """The French voice, downloaded once from its official page, checked byte for byte."""
    voices.mkdir(parents=True, exist_ok=True)
    for name, expected in PIPER_SHA256.items():
        path = voices / name
        if not path.exists():
            urllib.request.urlretrieve(PIPER_BASE + name, path)  # noqa: S310 (fixed https URL)
        if _sha256(path) != expected:
            path.unlink()
            raise RuntimeError(f"{name}: unexpected content, removed")
    return voices / f"{PIPER_VOICE}.onnx"


class French:
    voice_id = "piper-fr_FR-upmc-medium-jessica"

    def __init__(self, voices: Path):
        from piper import PiperVoice, SynthesisConfig

        self._voice = PiperVoice.load(str(_piper_files(voices)))
        self._config = SynthesisConfig(speaker_id=JESSICA)
        self.rate = self._voice.config.sample_rate

    def read(self, piece: str) -> list[np.ndarray]:
        return [chunk.audio_float_array for chunk in self._voice.synthesize(piece, syn_config=self._config)]


class Wolof:
    voice_id = "adia-tts"

    def __init__(self):
        import torch
        from parler_tts import ParlerTTSForConditionalGeneration
        from transformers import AutoTokenizer

        torch.manual_seed(7)
        self._torch = torch
        self._model = ParlerTTSForConditionalGeneration.from_pretrained(
            ADIA, revision=ADIA_REVISION, use_safetensors=True
        )
        self._tokenizer = AutoTokenizer.from_pretrained(ADIA, revision=ADIA_REVISION)
        self._description = self._tokenizer(ADIA_DESCRIPTION, return_tensors="pt").input_ids
        self.rate = self._model.config.sampling_rate

    def read(self, piece: str) -> list[np.ndarray]:
        clips: list[np.ndarray] = []
        for sentence in sentences(piece):
            prompt = self._tokenizer(sentence, return_tensors="pt").input_ids
            with self._torch.inference_mode():
                audio = self._model.generate(input_ids=self._description, prompt_input_ids=prompt)
            clips.append(audio.cpu().numpy().squeeze().astype(np.float32))
            clips.append(np.zeros(int(self.rate * SENTENCE_PAUSE_S), dtype=np.float32))
        return clips


def _speak(reader, pieces: list[str], out: Path) -> tuple[int, int]:
    clips: list[np.ndarray] = []
    for piece in pieces:
        clips.extend(reader.read(piece))
        clips.append(np.zeros(int(reader.rate * PARAGRAPH_PAUSE_S), dtype=np.float32))
    samples = np.concatenate(clips) if clips else np.zeros(1, dtype=np.float32)
    out.parent.mkdir(parents=True, exist_ok=True)
    partial = out.with_suffix(".part")
    # Speech at a moderate variable rate: small files, clear voice.
    sf.write(partial, samples, reader.rate, format="MP3", subtype="MPEG_LAYER_III",
             bitrate_mode="VARIABLE", compression_level=0.6)
    partial.replace(out)
    return round(len(samples) * 1000 / reader.rate), out.stat().st_size


def main() -> None:
    jobs = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    voices = Path(sys.argv[2])
    readers: dict[str, object] = {}
    for job in jobs:
        try:
            if job["lang"] not in readers:
                readers[job["lang"]] = French(voices) if job["lang"] == "fr" else Wolof()
            reader = readers[job["lang"]]
            duration_ms, size = _speak(reader, job["pieces"], Path(job["out"]))
            line = {"id": job["id"], "ok": True, "durationMs": duration_ms, "bytes": size,
                    "voiceId": reader.voice_id}
        except Exception as error:  # one failed job never stops the others
            line = {"id": job["id"], "ok": False, "error": f"{type(error).__name__}: {error}"}
        print(json.dumps(line), flush=True)


if __name__ == "__main__":
    main()
