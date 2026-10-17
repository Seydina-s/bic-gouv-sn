import { smallTalkOf } from "./small-talk";

describe("smallTalkOf", () => {
  it("answers greetings, thanks and who the assistant is, in French and Wolof as typed", () => {
    expect(smallTalkOf("Bonjour")).toBe("greeting");
    expect(smallTalkOf("Salamalekoum !")).toBe("greeting");
    expect(smallTalkOf("nanga def")).toBe("greeting");
    expect(smallTalkOf("Merci beaucoup !")).toBe("thanks");
    expect(smallTalkOf("dieuredieuf")).toBe("thanks");
    expect(smallTalkOf("Qui es-tu ?")).toBe("identity");
    expect(smallTalkOf("Bonjour, qui êtes-vous ?")).toBe("identity");
    expect(smallTalkOf("Que peux-tu faire pour moi ?")).toBe("identity");
  });

  it("answers them in English too, the app being offered in English", () => {
    expect(smallTalkOf("Hi!")).toBe("greeting");
    expect(smallTalkOf("Good morning")).toBe("greeting");
    expect(smallTalkOf("Thank you very much")).toBe("thanks");
    expect(smallTalkOf("Thanks a lot!")).toBe("thanks");
    expect(smallTalkOf("Hello, who are you?")).toBe("identity");
    expect(smallTalkOf("What can you do for me?")).toBe("identity");
  });

  it("leaves to the assistant any message that asks something", () => {
    expect(smallTalkOf("Bonjour, comment avoir un passeport ?")).toBeNull();
    expect(smallTalkOf("Merci de me dire qui est le Premier ministre")).toBeNull();
    expect(smallTalkOf("Comment obtenir un extrait de naissance ?")).toBeNull();
    expect(smallTalkOf("Hi, how do I get a passport?")).toBeNull();
    expect(smallTalkOf("Thank you, who is the Prime Minister?")).toBeNull();
  });
});
