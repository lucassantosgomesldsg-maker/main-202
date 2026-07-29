import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MotionA from "./MotionA";
import MotionB from "./MotionB";
import MotionC from "./MotionC";
import MotionD from "./MotionD";

const CANDIDATOS = [
  ["A", MotionA],
  ["B", MotionB],
  ["C", MotionC],
  ["D", MotionD],
] as const;

describe.each(CANDIDATOS)("Motion%s", (_nome, Componente) => {
  it("desenha a logo completa", () => {
    const { container } = render(<Componente />);
    expect(container.querySelectorAll("[data-glifo]")).toHaveLength(3);
    expect(container.querySelectorAll("[data-ponto]")).toHaveLength(1);
  });

  it("marca o modo estático quando pedido", () => {
    const { container } = render(<Componente estatico />);
    expect(container.firstElementChild).toHaveAttribute("data-estatico", "true");
  });

  it("não marca o modo estático por padrão", () => {
    const { container } = render(<Componente />);
    expect(container.firstElementChild).toHaveAttribute("data-estatico", "false");
  });
});
