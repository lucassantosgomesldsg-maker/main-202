/**
 * Os fatos do site que valem para buscadores, num lugar só.
 *
 * Antes disto, "https://202lab.com.br" estava escrito à mão em quatro pontos
 * (metadataBase e openGraph.url em app/layout.tsx, openGraph.url em
 * app/tese/layout.tsx) e agora entraria em mais três (sitemap, robots,
 * JSON-LD). Endereço canônico duplicado é exatamente o tipo de coisa que
 * diverge sem ninguém perceber — e divergir aqui não quebra a página, só faz
 * o Google achar que existem dois sites. O erro fica invisível até custar
 * ranqueamento, que é a pior categoria de erro para deixar solta.
 */

/**
 * A origem canônica: SEM www, decisão do Lucas.
 *
 * Isto sozinho NÃO resolve o www. A hospedagem hoje redireciona
 * 202lab.com.br → www.202lab.com.br (308), o oposto do que esta constante
 * declara. Enquanto a Vercel não for ajustada para tratar o apex como
 * domínio principal, o `<link rel="canonical">` gerado daqui vai apontar
 * para um endereço que redireciona — sinal contraditório, e o Google decide
 * sozinho quem ganha. O passo na Vercel é obrigatório, não opcional.
 *
 * Sem barra no fim: tudo aqui concatena `${URL_SITE}/algo`.
 */
export const URL_SITE = "https://202lab.com.br";

/**
 * A descrição que aparece embaixo do título no resultado do Google.
 *
 * NÃO é o oneliner. "Potencializamos talentos e construímos o futuro" é a
 * frase da marca — ela funciona na tela e não funciona na busca, porque não
 * contém nenhuma palavra que alguém digitaria procurando a 202. Esta frase
 * existe para o caso oposto: diz o que a 202 é, com os termos que a própria
 * tese usa (ecossistema de talentos, universidades brasileiras, trilhas,
 * mentoria, projetos, alocação).
 *
 * Toda palavra daqui saiu de /tese — nada foi inventado sobre a empresa.
 *
 * ~158 caracteres de propósito: o Google corta o trecho perto de 160, e uma
 * frase cortada no meio lê como descuido no único lugar onde a 202 tem uma
 * linha para convencer alguém a clicar.
 */
export const DESCRICAO_BUSCA =
  "A 202Lab é um ecossistema de talentos ancorado nas principais universidades brasileiras: trilhas autodidatas, mentoria, projetos reais e alocação.";

/**
 * O "cartão de identidade" da 202 para o Google (schema.org/Organization).
 *
 * É o que permite ao buscador entender que 202Lab é uma ORGANIZAÇÃO com nome,
 * site e perfil social — e não só um punhado de palavras numa página. É o que
 * alimenta o painel lateral da marca.
 *
 * Só entram fatos verificáveis: nome, endereço, descrição, logo e o Instagram
 * que lib/copy.ts já declara. Nada de endereço físico, fundação ou número de
 * funcionários — schema.org com dado inventado é pior que schema.org nenhum,
 * porque o Google cruza com outras fontes.
 *
 * `alternateName` cobre a grafia que as pessoas realmente digitam: quase
 * ninguém escreve "202Lab" colado de primeira.
 */
export function dadosOrganizacao(instagram: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "202Lab",
    alternateName: ["202 Lab", "202"],
    url: URL_SITE,
    description: DESCRICAO_BUSCA,
    // O mesmo SVG que public/ já serve. O Google aceita SVG para logo; se um
    // dia o painel da marca não aparecer, trocar por um PNG quadrado (≥112px)
    // é o primeiro palpite — não mexer no resto.
    logo: `${URL_SITE}/202_Branco.svg`,
    sameAs: [instagram],
    inLanguage: "pt-BR",
  };
}
