import type { MetadataRoute } from "next";
import { URL_SITE } from "@/lib/site";

/**
 * /robots.txt — a primeira coisa que um buscador pede antes de olhar
 * qualquer página. Até agora o site respondia 404 aqui.
 *
 * Um 404 em /robots.txt não bloqueia nada (na ausência do arquivo o robô
 * assume que pode entrar), então este arquivo NÃO é o que vai desbloquear a
 * indexação — nunca houve bloqueio. Ele existe pela segunda linha: é o lugar
 * padrão onde todo buscador procura o endereço do sitemap, inclusive os que
 * não têm um Search Console onde alguém possa cadastrá-lo à mão.
 *
 * Nada de `disallow`: as duas páginas do site devem ser indexadas.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${URL_SITE}/sitemap.xml`,
  };
}
