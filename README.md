# Casa Pomar — Silves

Página da moradia T6 à venda em Poço Barreto, Silves, com 50 fotografias e visita virtual de 23 panoramas interligados.

**Visitar o site:** https://mcgm78.github.io/casa-pomar-silves/

## Idiomas

O seletor no topo liga as versões portuguesa, inglesa (`en.html`), alemã (`de.html`) e francesa (`fr.html`). Cada página tem o seu endereço canónico, alternativas `hreflang` e conteúdo traduzido, incluindo as fotografias, a visita virtual e as mensagens de WhatsApp.

Editar o conteúdo português em `index.html` e as traduções em `translations.tsv`. Executar `python3 .github/build-languages.py` para atualizar as páginas, `i18n.js` e o mapa do site. O fluxo de publicação também executa esse passo e verifica as quatro versões automaticamente. O processo usa apenas Python e Node.js, sem dependências adicionais.

## Contactos

- Julio Miranda
- WhatsApp: +49 172 7134094
- Telefone: +351 919 825 799
- Email: jmiranda@t-online.de

## Publicação

O GitHub Pages é atualizado automaticamente por `.github/workflows/pages.yml` quando existem alterações no ramo `main`.

O código está na raiz do repositório. As fotografias, panoramas e o visualizador estão guardados em `media-01.zip` a `media-04.zip` para preservar a estrutura das pastas e permitir o envio integral. A publicação confirma a integridade dos arquivos, extrai os recursos e verifica as 50 fotografias, os 23 panoramas, as suas 60 ligações e os contactos antes de publicar.

Para obter os ficheiros para alojamento noutro servidor, copiar os ficheiros HTML/CSS/JS/SVG da raiz e extrair todos os arquivos `media-*.zip` para essa mesma pasta. Não é necessário compilar nem instalar dependências.

O Pannellum está incluído com a respetiva licença MIT em `vendor/pannellum-LICENSE.txt`, dentro dos arquivos de recursos.
