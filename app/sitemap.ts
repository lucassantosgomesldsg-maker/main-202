import type { MetadataRoute } from "next";
import { URL_SITE } from "@/lib/site";

/**
 * O mapa do site: a lista de endereços que existem, entregue em
 * /sitemap.xml para o Google ler de uma vez.
 *
 * Duas páginas, e são mesmo só duas — a home e a tese. O seletor PT/EN não
 * cria endereço nenhum (ele troca o texto no lugar, via localStorage), então
 * não há URL em inglês para listar aqui. Quando /en existir, cada entrada
 * ganha um par e este arquivo passa a declarar `alternates.languages`.
 *
 * `lastModified` está ausente de propósito. O valor honesto seria a data do
 * último commit que mexeu em cada página, e o que dá para escrever aqui é
 * `new Date()` — que, num Route Handler cacheado, congela no build e passa a
 * jurar que as duas páginas mudaram juntas toda vez que qualquer coisa do
 * projeto for publicada. Data errada é sinal pior que data nenhuma: o Google
 * aprende a ignorar o campo do site inteiro.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: URL_SITE,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      // A página com conteúdo de verdade (~500 palavras contra 58 da home).
      // Hoje é a única candidata real a ranquear por assunto, e não só por
      // marca — a prioridade alta diz isso ao Google.
      url: `${URL_SITE}/tese`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
