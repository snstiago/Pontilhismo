# Pontilhismo Irregular

App web simples para converter imagens num efeito de pontilhismo orgânico (tipo halftone, mas irregular).

## Como usar

1. Abre `index.html` no browser.
2. Clica em **Escolher imagem**.
3. Ajusta os sliders:
   - **Contraste / Brilho / Gamma**: definem a leitura tonal da imagem.
   - **Tamanho do grão**: espaçamento médio entre pontos.
   - **Densidade**: quantidade total de pontos.
   - **Irregularidade**: quebra a grelha e varia forma/tamanho dos pontos.
   - **Grumo/Blotch**: cria zonas mais agrupadas/orgânicas.
   - **Fecho de preto**: comprime sombras para os pretos ficarem mais compactos/sólidos.
   - **Clip de branco**: transforma tons quase brancos em branco puro (limpa fundo com grão).
   - **Limiar de fundo**: corta pontos em áreas claras da imagem original (ideal para limpar background).
   - **Ruído no fundo**: adiciona pontinhos em áreas claras.
4. Escolhe o **Modo de render**:
   - **Raster (clássico)**: modo rápido, não pré-calcula vetor.
   - **Vetorial (pré-calcula SVG)**: já deixa os paths prontos para exportar SVG.
5. Se quiseres, escolhe um **Preset** e clica em **Aplicar preset**.
6. Clica em **Exportar PNG** para guardar.
7. Clica em **Exportar SVG** para guardar em formato vetorial.

### SVG mais leve

O export SVG agora sai em **compound path** (um único `<path>` com subpaths), estilo “union-like” visual.
Isso reduz bastante o peso do ficheiro comparado com milhares de elementos `<path>` separados.

## Nota

Para obter algo próximo da imagem de referência, começa com:
- `Tamanho do grão`: 4 a 6
- `Irregularidade`: 0.45 a 0.70
- `Grumo/Blotch`: 0.25 a 0.45
- `Fecho de preto`: 0.75 a 1.20
- `Clip de branco`: 0.88 a 0.95
- `Ruído no fundo`: 0.00 a 0.15

Para fundo branco limpo:
- `Cor do papel`: `#ffffff`
- `Ruído no fundo`: `0.00`
- `Limiar de fundo`: desce de `1.00` para `0.75-0.90` até o grão desaparecer
