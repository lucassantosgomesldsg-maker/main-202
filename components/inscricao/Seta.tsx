/**
 * A seta dos botões da abertura.
 *
 * Virou componente em 19/09/2026, quando a abertura passou a ter três botões
 * com seta (o COMEÇAR do cartaz, o "COMO FUNCIONA" que rola a tela e o botão do
 * fecho) — até ali era um `<svg>` solto dentro do único botão que existia.
 *
 * `aria-hidden` é obrigatório, e não enfeite: sem ele a seta entraria no nome
 * acessível do botão, e ele deixaria de se chamar "COMEÇAR" — que é como a
 * página inteira, e os testes, se referem a ele.
 *
 * A seta para baixo é a MESMA seta, girada no CSS de quem a usa? Não: girar por
 * `transform` deixaria a caixa do SVG deitada e desalinharia o rótulo ao lado.
 * São dois desenhos de 24×24, e a caixa é sempre a mesma.
 */
export default function Seta({
  direcao = "direita",
  className,
}: {
  direcao?: "direita" | "baixo";
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {direcao === "direita" ? (
        <>
          <path d="M4 12h15" />
          <path d="m13 6 6 6-6 6" />
        </>
      ) : (
        <>
          <path d="M12 4v15" />
          <path d="m6 13 6 6 6-6" />
        </>
      )}
    </svg>
  );
}
