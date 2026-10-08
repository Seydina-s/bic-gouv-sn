from chunks import sentences


def test_keeps_short_sentences_whole_and_in_order():
    text = "Première phrase. Deuxième phrase !\nTroisième, au paragraphe suivant ?"
    assert sentences(text) == [
        "Première phrase.",
        "Deuxième phrase !",
        "Troisième, au paragraphe suivant ?",
    ]


def test_cuts_a_long_sentence_at_commas_then_spaces_within_the_limit():
    long = "un mot, " * 40 + "fin."
    pieces = sentences(long, limit=50)
    assert all(len(piece) <= 50 for piece in pieces)
    assert " ".join(pieces).split() == long.split()


def test_ignores_empty_lines():
    assert sentences("\n\n  \nSeule phrase.\n") == ["Seule phrase."]
