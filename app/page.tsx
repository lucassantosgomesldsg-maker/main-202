"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import Palco from "@/components/Palco";
import SeletorIdioma from "@/components/SeletorIdioma";
// O alias `as useMotionUmaVez` não é cosmético: a regra react-hooks só
// reconhece uma chamada como hook pelo NOME no ponto da chamada. Com o nome
// português o lint enxergava `usaMotionUmaVez()` como função comum e deixava
// passar chamada condicional — verificado: uma chamada dentro de `if` passava
// lint, tsc e build, e derrubava a página em runtime. O export segue em
// português (convenção do projeto); só o identificador local muda.
import { usaMotionUmaVez as useMotionUmaVez } from "@/lib/usaMotionUmaVez";
// Mesmo motivo do alias acima.
import { usaIdioma as useIdioma } from "@/lib/usaIdioma";
import { DURACAO_TOTAL_MAXIMA_MS, TEMPOS } from "@/lib/abertura";
import { COPY, INSTAGRAM, titulo } from "@/lib/copy";
import FraseDigitada from "@/components/FraseDigitada";
import estilos from "./abertura.module.css";

export default function Home() {
  const [idioma, trocarIdioma] = useIdioma();
  const t = COPY[idioma];
  const jaRodou = useMotionUmaVez();

  // `jaRodou` responde "já vi a entrada NESTA SESSÃO?" — a pergunta certa
  // para decidir se a animação toca de novo, mas a errada para decidir se um
  // <span> recém-montado deve nascer em opacity:1. Numa primeira visita,
  // `jaRodou` fica false a CARGA INTEIRA (só vira true numa carga seguinte,
  // via sessionStorage) — mesmo bem depois de a coreografia já ter terminado
  // de verdade. Sem este segundo bit, trocar de idioma depois do fim real da
  // entrada monta caracteres novos (o índice global muda de tamanho entre PT
  // e EN) sob a regra "tocando", com um --atraso que o relógio real já
  // passou — e eles ficam invisíveis, presos a esse atraso, por até ~4,2s.
  // `estatica` é a união das duas perguntas: "já vi a entrada" OU "a
  // coreografia desta carga já terminou".
  const [aberturaTerminou, setAberturaTerminou] = useState(false);
  const estatica = jaRodou || aberturaTerminou;

  // Isto NÃO fere a regra "zero JavaScript de animação" do design (§3): essa
  // regra é sobre a DIGITAÇÃO — o escalonamento dos caracteres não pode
  // depender de JS, para funcionar sem JavaScript e sem piscada de
  // hidratação. Este timer não anima nada: ele só vira uma chave DEPOIS que
  // a coreografia (toda ela CSS, com `forwards`/`both`) já chegou e segurou
  // o estado final. Com JavaScript desligado ele nunca dispara,
  // `data-abertura` permanece "tocando" para sempre, e as animações CSS
  // rodam e seguram o estado final pelo próprio `fill-mode` — o caminho sem
  // JS não muda em nada. Trocar de idioma já exige JavaScript de qualquer
  // forma.
  useEffect(() => {
    if (jaRodou) return; // já estático: não há coreografia tocando para terminar
    const fim = setTimeout(() => {
      setAberturaTerminou(true);

      // O layout não mudou — mas [data-ima="idioma"] e [data-ima="contato"]
      // passaram a entrada inteira TRANSLATADOS para fora da tela, e
      // getBoundingClientRect (que lib/usaLanterna.ts usa para medir os
      // alvos do ímã) INCLUI transform. Se o visitante mexeu o mouse durante
      // a entrada, a lanterna já mediu esses dois alvos ainda deslocados, e
      // não tem como perceber sozinha que a medição envelheceu:
      // ResizeObserver só dispara em mudança de TAMANHO, e translateX não
      // muda tamanho nenhum. "resize" é o sinal que lib/usaLanterna.ts já
      // escuta como "seus retângulos estão velhos, meça de novo" — não é um
      // mecanismo novo, é acionar o que já existe.
      window.dispatchEvent(new Event("resize"));
    }, DURACAO_TOTAL_MAXIMA_MS);
    return () => clearTimeout(fim);
  }, [jaRodou]);

  return (
    <main
      className={`tela ${estilos.abertura}`}
      /* O interruptor do `.topo` e do `.centro` — as duas regiões que
         enxergam este atributo diretamente. Nasce "tocando" para o HTML do
         servidor bater com o primeiro render do cliente, e vira "estatica"
         quando `estatica` for true: ou porque a sessão já viu a entrada
         (usaMotionUmaVez), ou porque a coreografia desta própria carga já
         terminou (ver o useEffect acima) — a `.base` lê o mesmo booleano por
         um segundo vocabulário, `data-estatica` em FraseDigitada. */
      data-abertura={estatica ? "estatica" : "tocando"}
      style={TEMPOS as CSSProperties}
    >
      {/* Único dono do <title>: app/layout.tsx deliberadamente não declara
          metadata.title (ver comentário lá). O React 19 hoista este elemento
          para o <head> de onde quer que ele esteja na árvore — é o jeito
          declarativo, sem escrita manual em document.title e sem correr
          atrás de nenhuma reconciliação do App Router. */}
      <title>{titulo(idioma)}</title>
      <header className="topo">
        <SeletorIdioma idioma={idioma} aoTrocar={trocarIdioma} />

        {/* As três âncoras da direita. O grupo existe porque `.topo` é um
            `space-between`: soltos, os links se espalhariam pela largura do
            topo em vez de ficarem juntos à direita. É também o grupo, e não
            cada link, que a abertura anima como um bloco só
            (`app/abertura.module.css`) — por isso acrescentar um item aqui não
            mexe na coreografia.

            `A TESE` vem antes, e sem seta. A `↗` do contato quer dizer uma
            coisa específica — "isto sai do site" —, e a ausência dela aqui diz
            a oposta, que é verdade. Duas setas lado a lado ainda leriam como
            uma sequência ("A TESE → CONTATO"), que não é o que são.

            data-ima: a lanterna gruda em cada um. É só uma marca lida por
            lib/usaLanterna — nada de pointer-events, nada de listener — então
            os links continuam clicáveis e focáveis exatamente como eram. */}
        <div className="topoDireita">
          <Link className="label tese" data-ima="tese" href="/tese">
            {t.tese}
          </Link>

          {/* A inscrição da trilha, desde 01/09/2026.

              A spec §11 fechava o contrário — "nenhum link para ela em lugar
              nenhum do site, nem home, nem tese, nem rodapé" — e a rota segue
              `noindex, nofollow`. As duas coisas convivem sem contradição: o
              `noindex` fala com buscador, este link fala com quem já está na
              home. A página continua fora do Google.

              Fica entre A TESE e CONTATO, e não depois do CONTATO, porque o
              CONTATO é o único link que SAI do site (a `↗` diz isso): pôr um
              destino interno depois dele quebraria a leitura de "primeiro o
              site, por último a saída".

              Sem `↗` pelo mesmo motivo que A TESE não tem: a seta significa
              "isto abre fora", e aqui não abre. */}
          <Link className="label inscricao" data-ima="inscricao" href="/trilha/inscricao">
            {t.inscricao}
          </Link>
          <a
            className="label contato"
            data-ima="contato"
            href={INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.contato} ↗
          </a>
        </div>
      </header>

      <div className="centro">
        <Palco />
      </div>

      <footer className="base">
        {/* A frase inteira é UM ímã, as duas linhas juntas. Aqui ele não é
            dica de clique (não há para onde ir) — é ênfase: a luz para em
            cima da frase. Decisão explícita do Lucas.

            É <h1> e não <p>: é a única frase da página que descreve o que a
            202 faz, então é o título dela para leitor de tela e para busca.
            Quem desenha o <h1>, os <span> por linha e os <span> por caractere
            é components/FraseDigitada — inclusive a digitação, que é CSS puro
            e não depende de JavaScript. */}
        <FraseDigitada idioma={idioma} estatica={estatica} />
      </footer>
    </main>
  );
}
