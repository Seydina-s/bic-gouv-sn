from chunks import fitting, sentences


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


def test_fits_a_sentence_whose_reading_is_too_long_by_halves_of_words():
    # Placeholder measure: three "phonemes" a letter, as numbers spelled out.
    measure = lambda text: 3 * len(text.replace(" ", ""))
    sentence = "un deux trois quatre cinq six sept huit neuf dix"
    pieces = fitting(sentence, measure, limit=40)
    assert all(measure(piece) <= 40 for piece in pieces)
    assert " ".join(pieces) == sentence
    assert fitting("court", measure, limit=40) == ["court"]


def test_leaves_out_a_single_word_too_long_to_read():
    assert fitting("anticonstitutionnellement", lambda text: len(text) * 30, limit=510) == []
