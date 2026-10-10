"""Reads contents aloud once, for the app to play (workflow of 03/10/2026).

French: Kokoro-82M, voice ff_siwis (Apache 2.0; SIWIS data), chosen by the owner in a
blind listening test on 10/10/2026. Words given as "[word](/phonemes/)" are said with
those phonemes (names the French rules mispronounce); see apps/api/src/voices.
Wolof: Adia_TTS by CONCREE (Apache 2.0).

Usage: python synthesize.py <jobs.json> <voices-dir>
jobs.json holds [{"id", "lang": "fr" | "wo", "pieces": [text, ...], "out": "file.mp3"}].
One JSON line per job on stdout: {"id", "ok": true, "durationMs", "bytes", "voiceId"}
or {"id", "ok": false, "error"}. Models load once, only for the languages asked.
"""

import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

from chunks import sentences

KOKORO = "hexgrad/Kokoro-82M"
# Pinned revision: the files read are those checked on 10/10/2026. Kokoro loads its
# weights with torch.load(weights_only=True): no code can run from them.
KOKORO_REVISION = "f3ff3571791e39611d31c381e3a41a3af07b4987"
KOKORO_VOICE = "ff_siwis"
# Kokoro reads at most 510 phonemes at once: French sentences are cut well below.
FRENCH_MAX = 300
GIVEN_PHONEMES = re.compile(r"\[([^\]]+)\]\(/([^/]+)/\)")
ADIA = "CONCREE/Adia_TTS"
# Pinned revision, weights in safetensors only: transformers stays at 4.46.1 because
# parler-tts requires it, and its known flaws are in loading untrusted (pickled)
# checkpoints. A pinned, verified revision in safetensors never runs such code.
ADIA_REVISION = "1a4ba9291efc3f40418ecace15ddb8bd8431d376"
ADIA_DESCRIPTION = "A clear and educational voice, with a flow adapted to learning"
# Silence between paragraphs, and between sentences read one by one (Wolof).
PARAGRAPH_PAUSE_S = 0.6
SENTENCE_PAUSE_S = 0.25


class French:
    voice_id = "kokoro-ff_siwis"

    def __init__(self, voices: Path):
        from huggingface_hub import hf_hub_download
        from kokoro import KModel, KPipeline

        def pinned(name: str) -> str:
            return hf_hub_download(KOKORO, name, revision=KOKORO_REVISION, cache_dir=voices)

        model = KModel(repo_id=KOKORO, config=pinned("config.json"), model=pinned("kokoro-v1_0.pth")).eval()
        self._pipeline = KPipeline(lang_code="f", repo_id=KOKORO, model=model)
        self._voice = pinned(f"voices/{KOKORO_VOICE}.pt")
        self.rate = 24000

    def phonemes(self, sentence: str) -> str:
        """The sentence's phonemes by the French rules, except the words given with theirs."""
        parts: list[str] = []
        start = 0
        for given in GIVEN_PHONEMES.finditer(sentence):
            parts.append(self._pipeline.g2p(sentence[start : given.start()])[0])
            parts.append(given.group(2))
            start = given.end()
        parts.append(self._pipeline.g2p(sentence[start:])[0])
        return " ".join(part.strip() for part in parts if part.strip())

    def read(self, piece: str) -> list[np.ndarray]:
        clips: list[np.ndarray] = []
        for sentence in sentences(piece, FRENCH_MAX):
            for result in self._pipeline.generate_from_tokens(self.phonemes(sentence), voice=self._voice):
                clips.append(np.asarray(result.audio, dtype=np.float32))
        return clips


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
