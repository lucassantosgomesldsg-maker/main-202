import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { COPY_INSCRICAO, TOTAL_BLOCOS, textoProgresso } from "@/lib/inscricao";
import Progresso from "./Progresso";

const C = COPY_INSCRICAO;

describe("o progresso", () => {
  it("continua montado sem passo nenhum, para poder anunciar o primeiro", () => {
    // Um `aria-live` só anuncia a mudança se a região já estava no documento
    // ANTES dela. Se o progresso nascesse junto com o bloco 1, quem clicasse em
    // COMEÇAR não ouviria nada e não saberia se o botão funcionou.
    const { container } = render(<Progresso atual={null} aoVoltarPara={() => {}} />);

    const regiao = container.querySelector('[role="status"]');
    expect(regiao, "a região de anúncio precisa existir desde a abertura").not.toBeNull();
    expect(regiao).toBeEmptyDOMElement();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("diz em que passo se está, e de que ele trata", () => {
    render(<Progresso atual={2} aoVoltarPara={() => {}} />);

    expect(screen.getByText(textoProgresso(3))).toBeInTheDocument();
    expect(screen.getByText(C.blocos[2].rotulo)).toBeInTheDocument();
  });

  it("desenha um segmento por bloco e marca um atual só", () => {
    const { container } = render(<Progresso atual={2} aoVoltarPara={() => {}} />);

    expect(container.querySelectorAll("li")).toHaveLength(TOTAL_BLOCOS);
    expect(container.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-estado="cumprido"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-estado="futuro"]')).toHaveLength(3);
  });

  it("deixa voltar pelo passo cumprido, e não pelo futuro", async () => {
    const voltar = vi.fn();
    render(<Progresso atual={2} aoVoltarPara={voltar} />);

    // Só os dois cumpridos são botões; o atual e os futuros não são clicáveis,
    // porque pular um bloco obrigatório só levaria a um erro alguns cliques
    // depois.
    expect(screen.getAllByRole("button")).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: C.blocos[0].rotulo }));
    expect(voltar).toHaveBeenCalledWith(0);
  });
});
