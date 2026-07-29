import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import SeletorIdioma from "./SeletorIdioma";

describe("SeletorIdioma", () => {
  it("oferece os dois idiomas como botões de verdade", () => {
    render(<SeletorIdioma idioma="pt" aoTrocar={() => {}} />);
    expect(screen.getByRole("button", { name: "PT" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument();
  });

  it("marca o idioma ativo para leitores de tela", () => {
    render(<SeletorIdioma idioma="pt" aoTrocar={() => {}} />);
    expect(screen.getByRole("button", { name: "PT" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "false");
  });

  it("avisa quando o outro idioma é clicado", async () => {
    const aoTrocar = vi.fn();
    render(<SeletorIdioma idioma="pt" aoTrocar={aoTrocar} />);
    await userEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(aoTrocar).toHaveBeenCalledWith("en");
  });
});
