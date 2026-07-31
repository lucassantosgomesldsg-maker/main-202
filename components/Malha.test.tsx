import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PARAMETROS } from "@/lib/malha";
import Lanterna from "./Lanterna";
import Malha, { lerPx } from "./Malha";

/**
 * Sem stub, o jsdom não implementa contexto 2d: `getContext("2d")` devolve
 * null e o efeito sai antes de agendar quadro. Isso é comportamento exigido, e
 * o segundo teste abaixo o verifica — este bloco não pode ganhar stub nenhum.
 *
 * O laço de desenho em si é testado no bloco "Malha — o laço de desenho", mais
 * abaixo, que finge o contexto 2d.
 */
describe("Malha", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renderiza um canvas escondido de leitores de tela", () => {
    const { container } = render(<Malha />);
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
  });

  it("não estoura quando o navegador não dá contexto 2d", () => {
    // É exatamente o que o jsdom faz sem o pacote `canvas` instalado. Se o
    // componente não sair de fininho aqui, a suíte inteira cai.
    expect(() => render(<Malha />)).not.toThrow();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("monta dentro de uma <Lanterna>, lendo a posição viva pelo contexto", () => {
    // Caminho diferente do teste acima: aqui o contexto NÃO é null. É o
    // arranjo real da página, e é o que prova que o provider e o consumidor
    // se encontram.
    const { container } = render(
      <Lanterna>
        <Malha />
      </Lanterna>
    );
    expect(container.querySelector("[data-lanterna] canvas")).not.toBeNull();
  });
});

/**
 * Contexto 2d de mentira: só os membros que components/Malha.tsx usa de fato.
 *
 * Existe porque sem ele o efeito inteiro de `Malha` — construir, desenhar,
 * resize, visibilidade, fonte, limpeza — sai na primeira linha em todo teste, e
 * fica sem cobertura nenhuma. Não é o jsdom "consertado": é o mínimo para o
 * laço rodar e as chamadas serem contáveis.
 */
function criarContexto2dFalso() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    measureText: vi.fn(() => ({ width: 10 })),
    font: "",
    fillStyle: "",
    textBaseline: "",
    shadowColor: "",
    shadowBlur: 0,
  };
}

type Contexto2dFalso = ReturnType<typeof criarContexto2dFalso>;

describe("Malha — o laço de desenho", () => {
  const CAIXA = { largura: 400, altura: 300 };
  let contextos: Map<HTMLCanvasElement, Contexto2dFalso>;
  let quadroPendente: FrameRequestCallback | null;
  let ultimoId: number;

  /** Roda o quadro agendado. O laço se reagenda sozinho, como no navegador. */
  function rodarQuadro(t: number) {
    const cb = quadroPendente;
    quadroPendente = null;
    expect(cb, "nenhum quadro estava agendado").not.toBeNull();
    cb!(t);
  }

  /** `matches` só para a consulta pedida — nunca para `(pointer: coarse)`,
   *  que faria o laço pular um quadro sim, um não e embaralhar as contagens. */
  function fingirMedia(reduzido: boolean) {
    vi.stubGlobal("matchMedia", (pergunta: string) => ({
      matches: reduzido && pergunta.includes("prefers-reduced-motion"),
      media: pergunta,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  /** O contexto do <canvas> que está no DOM. O da camada base é outro. */
  function contextoDaTela(container: HTMLElement) {
    const canvas = container.querySelector("canvas");
    const ctx = contextos.get(canvas as HTMLCanvasElement);
    expect(ctx, "o componente não pediu contexto 2d ao canvas da tela").toBeDefined();
    return ctx!;
  }

  beforeEach(() => {
    contextos = new Map();
    quadroPendente = null;
    ultimoId = 0;

    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((cb: FrameRequestCallback) => {
        quadroPendente = cb;
        return ++ultimoId;
      })
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    fingirMedia(false);

    // Sem isto o jsdom devolve 0x0, `construir()` sai antes de montar a grade,
    // e o laço rodaria sem nunca desenhar.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      width: CAIXA.largura,
      height: CAIXA.altura,
      top: 0,
      left: 0,
      right: CAIXA.largura,
      bottom: CAIXA.altura,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    // Um contexto POR canvas: o da tela e o da camada base precisam de
    // contagens separadas, senão os ~860 `fillText` da base se misturam com os
    // do quadro e nenhuma asserção significa nada.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      function (this: HTMLCanvasElement) {
        let ctx = contextos.get(this);
        if (!ctx) {
          ctx = criarContexto2dFalso();
          contextos.set(this, ctx);
        }
        return ctx as unknown as CanvasRenderingContext2D;
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("com prefers-reduced-motion, dois quadros com a lanterna parada não repintam", () => {
    fingirMedia(true);
    const { container } = render(<Malha />);
    const ctx = contextoDaTela(container);

    // `drawImage` é a cópia da base, e acontece exatamente uma vez por
    // repintura — é o contador honesto de "quantos quadros foram pintados".
    rodarQuadro(0);
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);

    // Segundo quadro, nada mudou: sem cintilação e com a luz parada, o quadro
    // anterior JÁ é a imagem certa, e este sai cedo. É o que faz "reduzir
    // movimento" custar quase nada sem um segundo mecanismo de notificação.
    rodarQuadro(16);
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });

  it("sem prefers-reduced-motion o segundo quadro repinta — a cintilação não dorme", () => {
    // Contraprova do teste acima: sem ela, "não repintou" poderia ser um laço
    // quebrado em vez do comportamento reduzido.
    const { container } = render(<Malha />);
    const ctx = contextoDaTela(container);

    rodarQuadro(0);
    rodarQuadro(16);
    expect(ctx.drawImage).toHaveBeenCalledTimes(2);
  });

  it("desmontar cancela o quadro agendado e remove o listener de visibilitychange", () => {
    const aoAdicionar = vi.spyOn(document, "addEventListener");
    const aoRemover = vi.spyOn(document, "removeEventListener");

    const { unmount } = render(<Malha />);

    const registro = aoAdicionar.mock.calls.find(
      ([tipo]) => tipo === "visibilitychange"
    );
    expect(registro, "o efeito não registrou visibilitychange").toBeDefined();

    const agendado = ultimoId;
    expect(agendado).toBeGreaterThan(0);

    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(agendado);

    // Mesma REFERÊNCIA de função. Com uma função diferente,
    // `removeEventListener` não remove nada e o vazamento passa em silêncio —
    // é o erro clássico deste ponto, e nenhum teste o pegava.
    const baixa = aoRemover.mock.calls.find(([tipo]) => tipo === "visibilitychange");
    expect(baixa?.[1]).toBe(registro![1]);

    // E, de fato, o listener não responde mais: um `visibilitychange` depois do
    // desmonte não pode acordar quadro nenhum sobre um canvas morto.
    const chamadasAntes = vi.mocked(requestAnimationFrame).mock.calls.length;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(vi.mocked(requestAnimationFrame).mock.calls.length).toBe(chamadasAntes);
  });
});

/**
 * `lerPx` não toca canvas nenhum — só `getComputedStyle` sobre um elemento
 * qualquer — então dá para testar sem contexto 2d, ao contrário do laço de
 * desenho acima.
 */
describe("lerPx", () => {
  it("aceita um valor em px", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    el.style.setProperty("--raio-lanterna", "192px");
    expect(lerPx(el, "--raio-lanterna", PARAMETROS.raioBase)).toBe(192);
    el.remove();
  });

  it("rejeita rem e cai no padrão — o navegador não converte unidade de custom property não registrada", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    el.style.setProperty("--raio-lanterna", "12rem");
    expect(lerPx(el, "--raio-lanterna", PARAMETROS.raioBase)).toBe(PARAMETROS.raioBase);
    el.remove();
  });

  it("cai no padrão quando a variável não está definida", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    expect(lerPx(el, "--raio-lanterna", PARAMETROS.raioBase)).toBe(PARAMETROS.raioBase);
    el.remove();
  });
});
