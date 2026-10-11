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

  it("leaves to the assistant any message that asks something", () => {
    expect(smallTalkOf("Bonjour, comment avoir un passeport ?")).toBeNull();
    expect(smallTalkOf("Merci de me dire qui est le Premier ministre")).toBeNull();
    expect(smallTalkOf("Comment obtenir un extrait de naissance ?")).toBeNull();
  });
});
