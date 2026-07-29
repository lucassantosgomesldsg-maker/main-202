import { describe, it, expect } from "vitest";
import { LOGO_GLIFOS, LOGO_VIEWBOX, LOGO_GRUPO_TRANSFORM } from "./logo-paths";

describe("logo-paths", () => {
  it("tem exatamente três glifos", () => {
    expect(LOGO_GLIFOS).toHaveLength(3);
  });

  it("cada glifo tem um path não-vazio começando com um comando de movimento", () => {
    for (const glifo of LOGO_GLIFOS) {
      expect(glifo.d.length).toBeGreaterThan(100);
      expect(glifo.d.trim().startsWith("M")).toBe(true);
    }
  });

  it("os glifos estão em ordem crescente de posição horizontal", () => {
    const xs = LOGO_GLIFOS.map((g) =>
      Number(/translate\(([-\d.]+)/.exec(g.transform)![1]),
    );
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it("o primeiro e o terceiro glifos são o mesmo desenho (2 … 2)", () => {
    expect(LOGO_GLIFOS[0].d).toBe(LOGO_GLIFOS[2].d);
  });

  it("expõe um viewBox e o transform do grupo", () => {
    expect(LOGO_VIEWBOX.split(" ")).toHaveLength(4);
    expect(LOGO_GRUPO_TRANSFORM).toContain("matrix");
  });
});
