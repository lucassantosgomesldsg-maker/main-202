import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { StrictMode } from "react";
import { usaMotionUmaVez, __resetarParaTeste } from "./usaMotionUmaVez";

describe("usaMotionUmaVez", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    __resetarParaTeste();
  });

  it("na primeira visita da sessão, deixa animar", () => {
    const { result } = renderHook(() => usaMotionUmaVez());
    expect(result.current).toBe(false);
  });

  it("marca a sessão depois de montar", () => {
    renderHook(() => usaMotionUmaVez());
    expect(window.sessionStorage.getItem("202:motion")).toBe("1");
  });

  it("na segunda visita da sessão, pede o estado estático", () => {
    window.sessionStorage.setItem("202:motion", "1");
    const { result } = renderHook(() => usaMotionUmaVez());
    expect(result.current).toBe(true);
  });

  it("sobrevive ao StrictMode, que roda o efeito duas vezes", () => {
    const { result } = renderHook(() => usaMotionUmaVez(), { wrapper: StrictMode });
    expect(result.current).toBe(false);
  });
});
