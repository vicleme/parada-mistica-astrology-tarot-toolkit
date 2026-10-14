# Como a nota de sinastria é calculada

Esta página explica como a calculadora de sinastria (`sinastria.html`) transforma dois mapas natais em suas notas. É escrita para quem quer entender, conferir ou ajustar os números. Todo valor abaixo mora em um destes cinco arquivos, e o código é a autoridade final se esta página e o código divergirem:

| Arquivo | O que guarda |
|---|---|
| `astro/js/core/weights.js` | O peso de um aspecto: queda por orbe, reforços por par, descontos. |
| `astro/js/core/orbs.js` | A orbe máxima permitida para cada aspecto e cada tipo de ponto. |
| `sinastria/js/calibration.js` | As constantes da pontuação: esticamento, limiares, referências do encolhimento, pesos do veredito. |
| `sinastria/js/scoring.js` | Quais aspectos contam como harmônicos, tensos ou mistos (`harmonicFraction`). |
| `sinastria/js/compute.js` | O fluxo que junta tudo. |

**O que a nota é, e o que não é.** É uma leitura estruturada de quantos fatores clássicos da sinastria apontam para um lado favorável ou difícil, e com que exatidão. Não é uma previsão de que a relação vai durar. Os estudos publicados que testaram o pareamento por signo solar contra casamento e divórcio encontraram efeitos pequenos ou nulos (veja [O que já foi testado](#o-que-já-foi-testado)).

## 1. De aspectos a pesos

Cada aspecto entre um ponto do mapa A e um ponto do mapa B recebe um peso. O peso é o produto de cinco fatores.

```
peso = queda por orbe × reforço do par × multiplicador do tipo de aspecto × desconto geracional × reforço de reciprocidade
```

**Limite de orbe.** Um aspecto só conta se a orbe estiver dentro de um máximo que depende do aspecto e dos pontos envolvidos. Fora dele, o peso é zero.

| Aspecto | Orbe base |
|---|---|
| Conjunção, oposição | 8° |
| Quadratura, trígono | 7° |
| Sextil | 5° |
| Quincúncio | 3° |
| Semissextil, semiquadratura, sesquiquadratura | 2° |

A orbe base é multiplicada por um fator do mais restrito dos dois pontos: Urano, Netuno e Plutão 0,75; Quíron, nodos, Vértice, Parte da Fortuna e Parte do Espírito 0,35; Lilith 0,25; todo o resto 1,0.

**Queda por orbe.** Quanto mais exato, mais pesado: `exp(−orbe / divisor)`. O divisor é 3,0 para conjunção e oposição, 2,5 para quadratura e trígono, 1,8 para sextil e quincúncio e 1,5 para os aspectos menores. Por exemplo, uma conjunção a 3° mantém cerca de 37% do peso.

**Reforço do par.** Os indicadores clássicos mais citados em sinastria pesam mais.

| Reforço | Pares |
|---|---|
| 1,35 | Sol–Lua, Vênus–Marte, pares do mesmo planeta pessoal (Sol–Sol, Lua–Lua, Vênus–Vênus, Marte–Marte, Mercúrio–Mercúrio), Mercúrio com Sol ou Lua, Ascendente com os planetas pessoais, Saturno com os planetas pessoais e com os ângulos |
| 1,30 | Nodos lunares com os planetas pessoais e com os ângulos |
| 1,20 | Vênus com Sol ou Lua, Marte com Sol ou Lua, Mercúrio com Vênus ou Marte, Júpiter com os planetas pessoais e com os ângulos, MC e IC com os planetas pessoais, Urano, Netuno ou Plutão tocando Sol, Lua, Vênus, Marte ou Mercúrio |
| 1,10 | Vértice, Quíron e Lilith com os planetas pessoais |
| 0,60 | Ascendente–Ascendente, Descendente–Descendente, Parte da Fortuna e Parte do Espírito com os planetas pessoais |
| 1,00 | Qualquer par não listado (a lista exata é `AXIS_BOOST` em `weights.js`) |

O Descendente é tratado como o Ascendente em conjunção, oposição e quadratura, e recebe um reforço intermediário de 1,28 com os planetas pessoais nos outros aspectos.

**Multiplicador do tipo de aspecto.** Aspectos maiores contam por inteiro (1,0). Um aspecto maior entre dois pontos não pessoais sem reforço curado conta 0,75. Aspectos menores contam menos: 0,6 se os dois pontos são planetas pessoais, 0,45 se um é, 0,35 se nenhum é.

**Desconto geracional.** Um aspecto entre dois planetas do trio Urano, Netuno e Plutão é compartilhado por uma geração inteira e diz pouco sobre o par, então é multiplicado por 0,3.

**Reforço de reciprocidade.** Quando o mesmo par de planetas está em aspecto nos dois sentidos (Vênus de A com Marte de B e Vênus de B com Marte de A), o peso é multiplicado por 1,15. Isso é testado apenas entre aspectos que já contam.

## 2. Harmônico, tenso ou misto

Cada aspecto divide seu peso entre um lado harmônico e um lado tenso por meio de uma fração entre 0 e 1 (`harmonicFraction`). Fração 1 é totalmente harmônico, 0 totalmente tenso.

| Aspecto | Fração |
|---|---|
| Trígono, sextil | 1,0 |
| Quadratura, oposição | 0 por padrão, com as exceções abaixo |
| Conjunção | Depende dos planetas. Os pares do tipo Marte–Vênus valem 0,65, Marte–Lua 0,45, Marte–Saturno 0,15; veja `scoring.js` para o resto |
| Semissextil | 0,5 |
| Quincúncio, semiquadratura | 0,2 |
| Sesquiquadratura | 0,15 |

Exceções de quadratura e oposição, cada uma baseada na leitura tradicional do par:

| Par | Fração | Leitura |
|---|---|---|
| Júpiter com Saturno | 0,1 | Majoritariamente tenso |
| Júpiter com qualquer outro ponto | 0,3 | Tenso, mas mais suave que um aspecto duro puro |
| Marte com Vênus ou Marte | 0,45 | Atração magnética com atrito: paixão, ciúme, tensão sexual |
| Vênus com Mercúrio, Sol, Lua ou Vênus | 0,25 | Atrito que continua benigno |
| Marte com Sol ou Ascendente | 0,30, **só na categoria Atração** | Faísca com atrito. Em todo o resto conta como tensão (0) |

A regra de Marte com Sol ou Ascendente é propositalmente mais fraca que a de Marte com Vênus, que é o par complementar clássico. Ela vale só dentro da Atração porque as fontes que a leem como faísca descrevem atração física, enquanto essas mesmas fontes a pontuam como negativa para a relação como um todo. Marte com Lua ficou de fora: tradicionalmente é lido como irritação e choque emocional.

Um aspecto com fração entre 0,41 e 0,59 aparece como *misto*, acima disso como *harmônico* e abaixo como *tenso*.

Cada aspecto então soma `peso × fração` ao total harmônico e `peso × (1 − fração)` ao total tenso de cada grupo a que pertence.

## 3. Grupos de cálculo

Os mesmos aspectos alimentam vários grupos (pools), cada um respondendo a uma pergunta diferente.

| Grupo | Pergunta |
|---|---|
| Geral | Quão harmônico é o quadro inteiro? Só contam aspectos de uma lista curada, para o ruído não diluir. |
| Atração | Desejo e puxão físico (Vênus, Marte, Ascendente, Sol e Lua tocando-os, Plutão/Netuno/Urano com Vênus, Marte ou Sol). |
| Emocional | Sentimentos, cuidado, sensação de segurança. |
| Intelectual | Comunicação e encaixe mental. |
| Prático | Vida cotidiana, rotina, trabalho em conjunto. |
| Afinidade | Leveza e calor, principalmente contatos de Júpiter. |
| Estrutura | O que sustenta o vínculo no tempo: Saturno, Sol–Lua, ângulos, casas de compromisso. |
| Destino | Nodos, Vértice e marcadores relacionados à sensação de ligação predestinada. |

As sobreposições de casas somam presença em algumas categorias, mas não carregam harmonia, porque um planeta numa casa diz onde a energia cai, não se ela flui.

## 4. De grupos a porcentagens

Para cada grupo, a parte harmônica é `harmônico / (harmônico + tenso) × 100`. Essa parte então é:

1. **Esticada** para longe de 50: `50 + (parte − 50) × 1,6`, depois limitada à faixa de 5 a 95. O esticamento alarga a faixa para que leituras claramente desequilibradas se destaquem.
2. **Encolhida quando há pouca evidência.** Se o peso total do grupo está abaixo de uma referência, o resultado é puxado para 50 em proporção: `50 + (esticado − 50) × min(1, peso / referência)`. Um grupo com um único aspecto fraco não deve mostrar uma porcentagem extrema.
3. **Deixada vazia** se o peso total estiver abaixo de 0,5, porque não há sinal suficiente para dizer nada.

As referências do encolhimento são o 5º percentil do peso de cada grupo em 20 mil pares aleatórios, então só cerca de 5% dos pares aleatórios ficam abaixo delas:

| Grupo | Peso de referência |
|---|---|
| Intelectual | 0,4 |
| Emocional | 0,8 |
| Atração | 3,3 |
| Prático | 2,8 |
| Afinidade | 0,5 |
| Estrutura | 2,6 |
| Destino | 0,5 |

Elas foram escolhidas só a partir de pares aleatórios, não ajustadas a nenhum casal real nem a nenhum desfecho de relacionamento.

**Presença.** Cada categoria também mostra em quanta evidência se apoia: `min(100, round(peso total × 22))`, ou 0 abaixo do piso de 0,5.

## 5. As notas principais

**Harmonia.** A parte esticada do grupo Geral.

**Compatibilidade (romântica).** A média geométrica de Atração e Estrutura, `√(Atração × Estrutura)`, ajustada pela Afinidade: `+ 0,08 × (Afinidade − 50)`, limitada de 0 a 100. A média geométrica faz com que uma nota alta em uma não esconda uma nota baixa na outra. Se Atração ou Estrutura estiver vazia, a Compatibilidade fica vazia.

**Compatibilidade (amizade e família).** A média das cinco categorias, cada uma ponderada pela sua presença, de modo que uma categoria com pouca sustentação conta pouco.

**Nitidez.** A porcentagem dos aspectos contados com orbe abaixo de 2°, multiplicada por 2,3 e limitada a 100. Mede o quanto os aspectos são exatos, não se são bons. O mesmo é calculado separadamente para o lado harmônico e para o tenso.

**Veredito.** Uma média ponderada de três partes:

| Parte | Peso |
|---|---|
| Compatibilidade | 0,50 |
| Harmonia | 0,3125 |
| Significância | 0,1875 |

A Significância é a harmonia, ponderada pelo peso, de Destino, Emocional e Intelectual nas leituras românticas, e de Estrutura e Destino nas demais. A média é então amplificada ou suavizada pela nitidez do lado para o qual aponta: `50 + (média − 50) × (0,7 + 0,65 × nitidez / 100)`. Uma leitura favorável bem exata é empurrada mais para cima, e uma vaga fica mais perto de 50.

## 6. Como ler os números

- Perto de **50%** significa que os fatores se equilibram ou são poucos, não que a relação seja neutra.
- Harmonia **entre 45% e 60%** é tratada como zona mista quando o texto nomeia o tipo de vínculo. Abaixo de 45% a leitura pende para a dificuldade e acima de 60% para a facilidade.
- Uma Atração baixa com Estrutura alta, ou o contrário, é informação por si só, e o texto aponta isso quando a diferença é grande.

## O que já foi testado

Não existe estudo de desfecho desta pontuação específica, e ela não foi ajustada a desfechos de relacionamento. O que se sabe:

- Estudos grandes sobre pareamento por signo solar e casamento encontraram pouco ou nada: Carlson (1985, *Nature*) não achou efeito; Schüller (2013, dados suíços) achou frequência um pouco maior de casamentos entre pessoas do mesmo signo, mas sem efeito sobre divórcio; Helgertz e Scott (2020, registros suecos) não encontraram apoio consistente. Todos usaram só o signo solar, não a sinastria completa.
- Uma checagem exploratória com 17 casais famosos (12 com hora de nascimento confirmada) achou correlação fraca entre Compatibilidade e duração da relação (ρ ≈ 0,51, p unilateral ≈ 0,044, 12 casais), e nenhuma ao incluir os cinco casais sem hora (ρ ≈ 0,22, p ≈ 0,20). A amostra é pequena demais para separar um efeito real fraco do acaso, e foi rodada antes de o plano de análise ser congelado, então não conta como confirmação.
- As constantes acima foram escolhidas pela estrutura de pares aleatórios e por leituras tradicionais, não ajustadas para maximizar a concordância com algum desfecho.

Trate o resultado como uma forma de organizar uma leitura, não como evidência sobre como uma relação vai ser.

## Como mudar os números

Edite o valor no arquivo indicado na primeira tabela e recarregue a página. Nada mais precisa mudar, porque `weights.js` é a fonte única dos pesos usados tanto pela calculadora de sinastria quanto pela página de mapas.
