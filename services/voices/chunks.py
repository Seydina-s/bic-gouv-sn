"""Cuts a text into the pieces a voice model reads well (sentences, never too long)."""

import re

# Adia_TTS was trained on sentences: past about this many characters it rushes or drifts.
WOLOF_MAX = 220

_SENTENCE_END = re.compile(r"(?<=[.!?…])\s+")
_CLAUSE_END = re.compile(r"(?<=[,;:])\s+")


def _split_long(sentence: str, limit: int) -> list[str]:
    """A sentence longer than `limit`: cut at commas, then at spaces."""
    if len(sentence) <= limit:
        return [sentence]
    pieces: list[str] = []
    current = ""
    for part in _CLAUSE_END.split(sentence):
        words = part.split(" ") if len(part) > limit else [part]
        for word in words:
            joined = f"{current} {word}".strip()
            if len(joined) > limit and current:
                pieces.append(current)
                current = word
            else:
                current = joined
    if current:
        pieces.append(current)
    return pieces


def sentences(text: str, limit: int = WOLOF_MAX) -> list[str]:
    """Sentences of `text`, each within `limit` characters, in order, none empty."""
    found: list[str] = []
    for paragraph in text.split("\n"):
        for sentence in _SENTENCE_END.split(paragraph.strip()):
            if sentence.strip():
                found.extend(_split_long(sentence.strip(), limit))
    return found
