"""Cuts a text into the pieces a voice model reads well (sentences, never too long)."""

import re
from collections.abc import Callable

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


def fitting(sentence: str, measure: Callable[[str], int], limit: int) -> list[str]:
    """`sentence` cut at spaces, in halves, until each piece measures at most `limit`.

    Kokoro reads at most 510 phonemes at once: numbers and acronyms spelled out made
    some sentences of 300 characters reach 1 122 (22/10/2026), and the whole article
    failed. A single word still too long is left out rather than failing the article.
    """
    if measure(sentence) <= limit:
        return [sentence]
    words = sentence.split(" ")
    if len(words) == 1:
        return []
    half = len(words) // 2
    return fitting(" ".join(words[:half]), measure, limit) + fitting(
        " ".join(words[half:]), measure, limit
    )
