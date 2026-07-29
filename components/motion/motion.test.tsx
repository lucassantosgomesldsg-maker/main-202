import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MotionA from "./MotionA";
import MotionB from "./MotionB";
import MotionC from "./MotionC";
import MotionD, {
  ATOS,
  DURACAO_TOTAL_MS,
  INICIO_LOGO,
  INICIO_PONTO,
} from "./MotionD";
import { DURACAO_MAXIMA_MS } from "./tipos";

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

/**
 * A ordem dos atos de D é a regra dura da coreografia: a logo não pode
 * aparecer antes da malha terminar, e o ponto verde é sempre o último. Estes
 * testes existem para que mexer numa duração não quebre a ordem em silêncio —
 * o CSS não tem nenhum tempo literal, ele consome exatamente estas variáveis.
 */
describe("MotionD — a coreografia", () => {
  it("faz a logo começar exatamente quando a malha termina", () => {
    expect(INICIO_LOGO).toBe(ATOS.malha);
  });

  it("faz o ponto verde começar exatamente quando a logo termina", () => {
    expect(INICIO_PONTO).toBe(ATOS.malha + ATOS.logo);
  });

  it("cabe no teto de duração do spec", () => {
    expect(DURACAO_TOTAL_MS).toBe(2000);
    expect(DURACAO_TOTAL_MS).toBeLessThanOrEqual(DURACAO_MAXIMA_MS);
  });

  it("entrega os tempos derivados ao CSS, sem número solto", () => {
    const { container } = render(<MotionD />);
    const palco = container.firstElementChild as HTMLElement;

    expect(palco.style.getPropertyValue("--d-malha")).toBe(`${ATOS.malha}ms`);
    expect(palco.style.getPropertyValue("--d-logo")).toBe(`${ATOS.logo}ms`);
    expect(palco.style.getPropertyValue("--d-ponto")).toBe(`${ATOS.ponto}ms`);
    // Os dois que carregam a ordem:
    expect(palco.style.getPropertyValue("--t-logo")).toBe(`${INICIO_LOGO}ms`);
    expect(palco.style.getPropertyValue("--t-ponto")).toBe(`${INICIO_PONTO}ms`);
  });
});
