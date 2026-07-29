import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import Lanterna from "./Lanterna";

const original = window.matchMedia;

/** jsdom não implementa matchMedia — sem este dublê o hook cai no caminho
 *  "ponteiro fino, sem reduced-motion", que é o padrão que queremos testar
 *  dos dois lados. */
function fingirMedia(respostas: Record<string, boolean> = {}) {
  window.matchMedia = vi.fn((consulta: string) => ({
    matches: respostas[consulta] ?? false,
    media: consulta,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = original;
  vi.restoreAllMocks();
});

const contaMousemove = () => {
  const espia = vi.spyOn(window, "addEventListener");
  return () =>
    espia.mock.calls.filter(([tipo]) => tipo === "mousemove").length;
};

describe("Lanterna", () => {
  it("renderiza e é escondida de leitores de tela", () => {
    fingirMedia();
    const { container } = render(<Lanterna />);
    const el = container.querySelector("[data-lanterna]");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("mostra o que for colocado dentro dela", () => {
    fingirMedia();
    const { container } = render(
      <Lanterna>
        <div data-testid="malha" />
      </Lanterna>
    );
    expect(container.querySelector("[data-lanterna] [data-testid='malha']")).toBeInTheDocument();
  });

  it("não registra listener nenhum quando o ponteiro é grosso", () => {
    fingirMedia({ "(pointer: coarse)": true });
    const mousemoves = contaMousemove();
    render(<Lanterna />);
    expect(mousemoves()).toBe(0);
  });

  it("registra o listener quando o ponteiro é fino", () => {
    // Controle positivo: sem isto, o teste acima passaria mesmo se o
    // componente nunca registrasse listener nenhum em situação alguma.
    fingirMedia({ "(pointer: coarse)": false });
    const mousemoves = contaMousemove();
    render(<Lanterna />);
    expect(mousemoves()).toBe(1);
  });

  it("fica inativa até o primeiro movimento do mouse", () => {
    fingirMedia();
    const { container } = render(<Lanterna />);
    expect(container.querySelector("[data-lanterna]")).toHaveAttribute(
      "data-ativa",
      "false"
    );
  });

  it("escreve a posição no quadro seguinte, nunca dentro do mousemove", async () => {
    fingirMedia();
    const { container } = render(<Lanterna />);
    const el = container.querySelector("[data-lanterna]") as HTMLElement;

    window.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 300, clientY: 200 })
    );

    // Logo depois do evento ainda não há posição escrita: quem escreve é o
    // requestAnimationFrame. É esta asserção que prova a regra do brief.
    expect(el.style.getPropertyValue("--lanterna-x")).toBe("");

    await waitFor(() => {
      expect(el.style.getPropertyValue("--lanterna-x")).not.toBe("");
    });
    expect(el.style.getPropertyValue("--lanterna-y")).not.toBe("");
    expect(el).toHaveAttribute("data-ativa", "true");
  });

  it("publica a escala do ímã junto com a posição, e ela começa em 1", () => {
    // O contrato com o CSS: o raio da máscara é --raio-lanterna vezes esta
    // variável (ver Fundo202020.module.css). Sem alvo nenhum na página ela
    // vale 1 — a luz do tamanho de sempre.
    fingirMedia();
    const { container } = render(<Lanterna />);
    const el = container.querySelector("[data-lanterna]") as HTMLElement;

    window.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 300, clientY: 200 })
    );

    return waitFor(() => {
      expect(el.style.getPropertyValue("--escala-lanterna")).toBe("1.000");
    });
  });

  it("solta os listeners ao desmontar", () => {
    fingirMedia();
    const espia = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Lanterna />);
    unmount();
    expect(
      espia.mock.calls.filter(([tipo]) => tipo === "mousemove")
    ).toHaveLength(1);
  });
});
