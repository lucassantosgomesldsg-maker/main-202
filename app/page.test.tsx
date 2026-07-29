import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renderiza sem quebrar", () => {
    render(<Home />);
    expect(screen.getByText("202")).toBeInTheDocument();
  });
});
