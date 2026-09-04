import Link from "next/link";
import { connection } from "next/server";
import Formulario from "@/components/inscricao/Formulario";
import { COPY_INSCRICAO } from "@/lib/inscricao";
import { inscricoesAbertas } from "@/lib/inscricao-banco";
import estilos from "./inscricao.module.css";

/**
 * A página. É um **Server Component**, e é aqui que se decide entre o
 * formulário e a tela de inscrições encerradas.
 *
 * Por que no servidor e não no cliente: se o navegador descobrisse que as
 * inscrições fecharam só depois de montar, a pessoa veria o formulário inteiro
 * piscar antes de sumir — e alguém começaria a preencher no meio disso. O
 * interruptor da §9.4 é estado de request, então quem o lê é o request.
 *
 * `await connection()` é o que impede o Next de resolver essa pergunta **uma
 * vez, no build**, e servir a resposta congelada para sempre. Sem ele, um build
 * feito com as inscrições abertas continuaria dizendo "abertas" depois de o
 * Matheus virar a chave no banco. Os docs desta versão preferem `connection()`
 * a `export const dynamic = "force-dynamic"` exatamente por dizer o porquê:
 * esta página depende do request, não de uma configuração de cache
 * (`node_modules/next/dist/docs/.../use-search-params.md`).
 *
 * `inscricoesAbertas()` nunca lança e devolve `true` quando o banco não
 * responde — um banco fora do ar não pode fechar as inscrições sozinho.
 */
export default async function PaginaInscricao() {
  await connection();
  const abertas = await inscricoesAbertas();

  const encerrado = COPY_INSCRICAO.encerrado;
  const tese = COPY_INSCRICAO.confirmacao.tese;

  return (
    <main className={estilos.pagina}>
      <div className={estilos.coluna}>
        {abertas ? (
          <Formulario />
        ) : (
          <section className={estilos.tela} data-tela="encerrado">
            <p className={`label ${estilos.rotuloTela}`}>{encerrado.rotulo}</p>
            <h1 className={estilos.titulo}>{encerrado.titulo}</h1>
            {encerrado.linhas.map((linha) => (
              <p key={linha} className={estilos.linha}>
                {linha}
              </p>
            ))}
            {/* A segunda linha da copy prepara este link ("o argumento inteiro
                da 202 está escrito numa página só"), então ele fecha a frase em
                vez de aparecer do nada. É a única saída da tela. */}
            <Link className={`label ${estilos.saida}`} href={tese.href}>
              {tese.botao}
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
