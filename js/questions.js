// =============================================================
//  BANCO DE PERGUNTAS SUGERIDAS
//
//  Estrutura:
//    PERGUNTAS_SUGERIDAS[spreadId][areaId] = [ "pergunta", ... ]
//
//  Áreas disponíveis:
//    "geral"         — perguntas abertas / sem tema definido
//    "amor"          — relacionamentos amorosos e afetivos
//    "trabalho"      — carreira, finanças, projetos profissionais
//    "espiritual"    — autoconhecimento, propósito, caminhos internos
//
//  Fallback automático:
//    Se não houver entrada para spread+área, o sistema usa "geral"
//    do mesmo spread. Se o spread não tiver "geral", usa o spread
//    "livre" como último recurso.
//
//  Para adicionar perguntas:
//    1. Localize o spread pelo seu id (ex: "cruz-celta")
//    2. Localize ou crie a área (ex: "amor")
//    3. Adicione strings ao array — 4 a 6 perguntas é o ideal
// =============================================================

window.PERGUNTAS_SUGERIDAS = {

    // ── LIVRE (sem posições fixas) ────────────────────────────
    "livre": {
        "geral": [
            "O que eu preciso saber sobre essa situação agora?",
            "Qual energia está presente na minha vida neste momento?",
            "O que está bloqueando meu caminho e como superar?",
            "O que eu ainda não estou vendo claramente?",
            "Qual a mensagem mais importante para mim hoje?"
        ],
        "amor": [
            "O que eu preciso entender sobre minha vida amorosa agora?",
            "O que está impedindo uma conexão mais profunda no meu relacionamento?",
            "O que este relacionamento veio me ensinar?",
            "Como posso abrir mais espaço para o amor na minha vida?",
            "O que meu coração precisa que eu ainda não ouvi?"
        ],
        "trabalho": [
            "O que eu preciso saber sobre minha carreira neste momento?",
            "Que energia está presente no meu ambiente de trabalho?",
            "O que pode estar travando meu crescimento profissional?",
            "Que habilidade devo desenvolver para avançar?",
            "Como estou me posicionando diante das oportunidades?"
        ],
        "espiritual": [
            "O que minha alma mais precisa neste momento?",
            "Que padrão estou repetindo e preciso transformar?",
            "O que o universo quer me mostrar agora?",
            "Como posso me reconectar com meu propósito?",
            "Qual sombra estou evitando encarar?"
        ]
    },

    // ── PASSADO · PRESENTE · FUTURO ───────────────────────────
    "passado-presente-futuro": {
        "geral": [
            "Como esta situação evoluiu e para onde está indo?",
            "O que ficou do passado ainda influencia meu presente?",
            "Qual é a tendência desta situação se eu continuar como estou?",
            "Como esta fase da minha vida está se transformando?",
            "O que o passado, o presente e o futuro têm a me dizer sobre isso?"
        ],
        "amor": [
            "Como minha história amorosa chegou até aqui e para onde vai?",
            "O que o passado me ensinou sobre amor e o que ainda carrego?",
            "Onde está este relacionamento agora e qual a sua tendência?",
            "Como posso transformar padrões afetivos do passado?",
            "O que o futuro reserva para minha vida amorosa?"
        ],
        "trabalho": [
            "Como minha trajetória profissional chegou até aqui?",
            "O que do passado profissional ainda me impacta hoje?",
            "Para onde está indo minha carreira se eu mantiver o rumo atual?",
            "Como esta mudança de trabalho pode se desenrolar?",
            "O que preciso transformar para evoluir profissionalmente?"
        ],
        "espiritual": [
            "Que karma ou padrão ancestral ainda influencia meu presente?",
            "Onde estou na minha jornada espiritual agora?",
            "Para onde minha alma está caminhando se eu seguir este caminho?",
            "O que ficou do passado que ainda precisa ser curado?",
            "Que transformação espiritual está em curso na minha vida?"
        ]
    },

    // ── PASSAGEM SEGURA ───────────────────────────────────────
    "passagem-segura": {
        "geral": [
            "O que preciso saber para atravessar este momento com mais clareza?",
            "Que passagem estou vivendo e o que ela pede de mim?",
            "O que fica para trás, o que falta e para onde sigo?",
            "Que lições e potenciais cercam esta travessia?",
            "O que está bloqueando minha passagem e o que posso ganhar ao atravessar?"
        ],
        "amor": [
            "Que passagem este relacionamento está me pedindo que eu faça?",
            "O que falta para eu atravessar este ciclo afetivo com segurança?",
            "Que lições aprendi e o que ainda bloqueia meu coração?",
            "Para onde este relacionamento está me levando?",
            "O que posso ganhar ao atravessar esta fase amorosa com coragem?"
        ],
        "trabalho": [
            "Que transição profissional estou atravessando agora?",
            "O que falta para esta passagem na carreira se completar?",
            "Que lições este ciclo de trabalho me deixou?",
            "O que bloqueia meu avanço profissional neste momento?",
            "Que ganhos e crescimento estão disponíveis nesta travessia?"
        ],
        "espiritual": [
            "Que iniciação ou passagem espiritual estou vivendo?",
            "O que minha alma ainda precisa para atravessar este ciclo?",
            "Que lições e sombras cercam esta travessia interior?",
            "O que bloqueia meu avanço espiritual e o que posso conquistar?",
            "Para onde minha jornada está me conduzindo agora?"
        ]
    },

    // ── CRUZ DE PÉLADAN ───────────────────────────────────────
    "peladan": {
        "geral": [
            "O que apoia e o que se opõe nesta situação — e para onde ela caminha?",
            "Quais são os panoramas positivo e negativo desta questão e qual a resposta final?",
            "O que joga a meu favor e o que dificulta — e qual o desfecho desta situação?",
            "Como estão as forças em torno desta questão e o que devo esperar?",
            "O que esta situação tem de favorável e de desafiador — e qual a saída?"
        ],
        "amor": [
            "O que apoia e o que dificulta este relacionamento — e para onde ele vai?",
            "Quais são os lados positivo e negativo desta relação e qual a resposta do tarô?",
            "O que joga a favor e o que pesa neste amor — e qual o desfecho possível?",
            "Como estão as forças em torno desta conexão afetiva?",
            "O que há de bom e de difícil nesta situação amorosa — e qual o caminho?"
        ],
        "trabalho": [
            "O que apoia e o que dificulta esta situação profissional — e para onde vai?",
            "Quais são os panoramas positivo e negativo desta decisão de carreira?",
            "O que joga a favor e o que pesa neste projeto ou emprego?",
            "Como estão as forças em torno desta questão profissional e qual o desfecho?",
            "O que há de favorável e de desafiador nesta fase da carreira — e qual a saída?"
        ],
        "espiritual": [
            "O que apoia e o que bloqueia meu avanço espiritual neste momento?",
            "Quais são as forças favoráveis e desfavoráveis nesta jornada interior?",
            "O que joga a favor e o que pesa no meu processo de transformação?",
            "Como estão as energias em torno desta questão de alma — e para onde vai?",
            "O que há de luminoso e de sombrio neste caminho — e qual a resposta?"
        ]
    },

    // ── CRUZ CELTA ────────────────────────────────────────────
    "cruz-celta": {
        "geral": [
            "O que está realmente acontecendo nesta situação que enfrento?",
            "Como posso navegar este momento complexo da minha vida?",
            "O que preciso entender sobre este desafio em todas as suas camadas?",
            "Que forças visíveis e invisíveis estão atuando nesta questão?",
            "Como esta situação pode se resolver da melhor forma possível?"
        ],
        "amor": [
            "O que está realmente em jogo neste relacionamento?",
            "Que forças internas e externas influenciam minha vida amorosa agora?",
            "Como posso entender melhor esta relação em toda a sua complexidade?",
            "O que está no centro deste conflito afetivo?",
            "Qual é o potencial real desta relação e o que pode impedi-la?"
        ],
        "trabalho": [
            "O que está realmente acontecendo na minha situação profissional?",
            "Que forças estão atuando nesta decisão de carreira?",
            "Como posso navegar este momento de transição no trabalho?",
            "O que está no centro deste desafio profissional?",
            "Qual o potencial desta oportunidade e o que pode bloqueá-la?"
        ],
        "espiritual": [
            "Que processo de transformação está acontecendo em mim agora?",
            "O que está no centro do que preciso aprender nesta fase?",
            "Que forças internas e externas moldam meu caminho espiritual?",
            "Como posso entender melhor este momento de crise ou crescimento?",
            "Qual o potencial desta jornada interior e o que me impede de avançar?"
        ]
    },

    // ── FERRADURA ─────────────────────────────────────────────
    "ferradura": {
        "geral": [
            "Como esta situação se desenvolveu e para onde caminha?",
            "Que obstáculos estão no meu caminho e como superá-los?",
            "O que as pessoas ao meu redor trazem para esta situação?",
            "Qual conselho as cartas têm para este momento da minha vida?",
            "Como posso agir melhor diante deste desafio?"
        ],
        "amor": [
            "Como chegamos até aqui neste relacionamento?",
            "Que obstáculos estão dificultando esta relação?",
            "O que as pessoas próximas influenciam na minha vida amorosa?",
            "Que conselho as cartas têm para meu coração agora?",
            "Como posso agir melhor para nutrir este relacionamento?"
        ],
        "trabalho": [
            "Como esta situação profissional se desenvolveu?",
            "Que obstáculos encontro na minha carreira agora?",
            "O que colegas ou parceiros trazem para esta situação?",
            "Que conselho as cartas têm para minha decisão profissional?",
            "Como posso agir com mais sabedoria neste contexto de trabalho?"
        ],
        "espiritual": [
            "Como cheguei até este ponto da minha jornada interior?",
            "Que obstáculos espirituais preciso superar?",
            "Que influências externas atuam no meu desenvolvimento?",
            "Que conselho as cartas têm para meu crescimento espiritual?",
            "Como posso agir com mais consciência neste momento?"
        ]
    },

    // ── SIM OU NÃO ────────────────────────────────────────────
    "sim-nao": {
        "geral": [
            "Devo aceitar esta oportunidade que surgiu?",
            "É o momento certo para tomar esta decisão?",
            "Esta mudança que estou pensando é favorável para mim?",
            "Devo seguir em frente com este plano?",
            "Esta situação vai se resolver de forma positiva?"
        ],
        "amor": [
            "Devo dar uma chance para esta pessoa?",
            "É o momento de conversar sobre o futuro deste relacionamento?",
            "Este relacionamento tem potencial de crescer?",
            "Devo retomar o contato com esta pessoa?",
            "É o momento certo para me declarar?"
        ],
        "trabalho": [
            "Devo aceitar esta proposta de trabalho?",
            "É o momento certo para pedir aumento ou promoção?",
            "Devo investir neste projeto?",
            "É favorável abrir meu próprio negócio agora?",
            "Devo mudar de emprego neste momento?"
        ],
        "espiritual": [
            "Estou no caminho certo para meu crescimento?",
            "Devo seguir esta prática ou ensinamento espiritual?",
            "É o momento de fazer este retiro ou processo?",
            "Estou pronto para lidar com o que precisa ser transformado?",
            "Esta decisão está alinhada com meu propósito mais elevado?"
        ]
    },

    // ── LINHA DE 3 ────────────────────────────────────────────
    "linha-3": {
        "geral": [
            "O que está em movimento nesta situação agora?",
            "Qual o tema central, a dinâmica e o resultado desta questão?",
            "O que preciso ver sobre este assunto?",
            "Qual a mensagem mais direta das cartas para este momento?",
            "O que está acontecendo, o que se move e para onde vai?"
        ],
        "amor": [
            "Qual o tema, a dinâmica e o resultado desta relação agora?",
            "O que está em movimento entre mim e esta pessoa?",
            "Como está o fluxo de energia neste relacionamento?",
            "O que define, move e resultará nesta situação amorosa?",
            "Qual a mensagem direta sobre minha vida afetiva?"
        ],
        "trabalho": [
            "Qual o contexto, a dinâmica e o resultado desta situação profissional?",
            "O que está em movimento na minha carreira agora?",
            "Como está fluindo a energia no meu ambiente de trabalho?",
            "O que define, move e resultará neste projeto?",
            "Qual a mensagem direta das cartas sobre este emprego ou oportunidade?"
        ],
        "espiritual": [
            "Qual o tema, o que está em movimento e para onde vai minha jornada?",
            "O que define, move e resultará neste processo espiritual?",
            "Como está fluindo minha energia interior agora?",
            "O que preciso ver com clareza sobre este caminho?",
            "Qual a mensagem direta sobre este momento de autoconhecimento?"
        ]
    },

    // ── LINHA DE 5 ────────────────────────────────────────────
    "linha-5": {
        "geral": [
            "Como está o fluxo desta situação do passado ao futuro?",
            "O que cerca, define e encaminha esta questão?",
            "Qual o arco completo desta situação na minha vida?",
            "O que preciso entender sobre este momento em cinco camadas?",
            "Qual o caminho desta questão: origem, contexto, centro, conselho e destino?"
        ],
        "amor": [
            "Qual o arco desta relação — de onde veio, onde está e para onde vai?",
            "O que orienta e define esta situação amorosa em cinco camadas?",
            "Como está o fluxo de energia neste relacionamento agora?",
            "O que preciso saber sobre esta relação do começo ao fim?",
            "Qual o conselho central para esta fase do meu amor?"
        ],
        "trabalho": [
            "Qual o arco desta situação profissional — origem, contexto e destino?",
            "Como está o fluxo da minha carreira em cinco dimensões?",
            "O que preciso entender sobre este projeto do início ao fim?",
            "Qual o conselho central para este momento profissional?",
            "O que cerca, define e encaminha esta decisão de trabalho?"
        ],
        "espiritual": [
            "Qual o arco da minha jornada espiritual agora?",
            "Como está fluindo meu processo interior em cinco camadas?",
            "O que preciso entender sobre esta fase de autoconhecimento?",
            "Qual o conselho central para meu crescimento espiritual?",
            "O que está na raiz, no presente e no horizonte da minha evolução?"
        ]
    },

    // ── AMOROSA DE 5 ─────────────────────────────────────────
    "amorosa-5": {
        "geral": [
            "O que cada um traz e o que existe entre nós neste relacionamento?",
            "Quais são as forças e fraquezas desta conexão?",
            "Como eu, a outra pessoa e o relacionamento estão agora?",
            "O que sustenta e o que desafia esta relação?",
            "Que energias circulam entre nós e como esta ligação pode evoluir?"
        ],
        "amor": [
            "Como estamos eu e esta pessoa — e o que existe entre nós?",
            "O que fortalece e o que fragiliza este relacionamento amoroso?",
            "Que dinâmica se criou entre nós e como ela pode se transformar?",
            "O que cada um traz para esta relação e o que ela pede de nós?",
            "Quais são os pilares e os desafios desta conexão afetiva?"
        ],
        "espiritual": [
            "Que propósito espiritual esta conexão carrega?",
            "O que cada alma traz e o que existe entre nós em nível mais profundo?",
            "Que forças e sombras cercam este vínculo?",
            "O que esta relação veio transformar em cada um?",
            "Que lições espirituais sustentam ou desafiam este laço?"
        ]
    },


    // ── ESPELHO DE EROS ───────────────────────────────────────
    "espelho-eros": {
        "geral": [
            "O que cada um de nós sente e como nos vemos mutuamente?",
            "Como os sentimentos e percepções de cada lado se espelham nesta relação?",
            "O que existe entre nós quando olhamos um para o outro?",
            "O que meus olhos e meu coração veem que o outro talvez não saiba?",
            "O que este espelho revela sobre a dinâmica entre nós?"
        ],
        "amor": [
            "O que sinto por você e como te vejo — e o que você sente e vê em mim?",
            "Como nos enxergamos mutuamente e o que isso cria entre nós?",
            "O que este amor parece por dentro de cada um de nós?",
            "O que meus sentimentos e percepções revelam sobre este relacionamento?",
            "Onde nossos olhares e corações se encontram — e onde se desencontram?"
        ],
        "espiritual": [
            "O que cada alma carrega em relação à outra nesta conexão?",
            "Como nos reconhecemos espiritualmente — e o que ainda não vemos um no outro?",
            "Que espelho kármico esta relação projeta entre nós?",
            "O que minha alma sente e percebe nesta pessoa que minha mente ainda resiste?",
            "Que verdade este espelho revela sobre o vínculo entre nossas almas?"
        ]
    },

    // ── TEMPLO DE AFRODITE ────────────────────────────────────
    "templo-afrodite": {
        "geral": [
            "O que os pensamentos, sentimentos, intenções e atitudes de cada um revelam sobre nós?",
            "Como cada um de nós está vivendo este relacionamento por dentro e por fora?",
            "O que existe entre nós e para onde essa relação está caminhando?",
            "O que A e B precisam entender um sobre o outro agora?",
            "Que dinâmica real se esconde por trás do que cada um demonstra?"
        ],
        "amor": [
            "Como cada um de nós está vivendo este amor — por dentro e por fora?",
            "O que pensamos, sentimos, queremos e fazemos neste relacionamento?",
            "Onde há alinhamento e onde há desencontro entre nós dois?",
            "O que a relação entre nós revela além do que cada um expressa?",
            "Para onde caminha este amor segundo o que cada um carrega agora?"
        ],
        "espiritual": [
            "Que propósito espiritual une A e B neste relacionamento?",
            "O que cada um carrega karmicamente e o que isso cria entre nós?",
            "Onde há ressonância e onde há tensão entre as almas de A e B?",
            "O que esta relação veio despertar ou curar em cada um?",
            "Qual o destino espiritual deste vínculo segundo o que cada um traz?"
        ]
    },

    // ── IKIGAI ────────────────────────────────────────────────
    "ikigai": {
        "geral": [
            "O que me move, onde me destaco, o que o mundo pede e pelo que posso ser valorizado?",
            "Qual é o ponto de convergência entre minha paixão, talento, vocação e sustento?",
            "O que as cartas revelam sobre o meu Ikigai neste momento da vida?",
            "O que ainda não estou vendo sobre o encontro entre o que amo e o que o mundo precisa?",
            "Como paixão, habilidade, propósito e reconhecimento se cruzam no meu caminho agora?"
        ],
        "trabalho": [
            "Como meu talento, minha paixão e minha carreira podem se alinhar?",
            "O que o tarô revela sobre o meu Ikigai profissional neste momento?",
            "Onde estão os pontos cegos entre o que faço bem e o que o mundo precisa?",
            "O que ainda falta para que meu trabalho se torne verdadeiramente significativo?",
            "Como posso transformar o que amo em algo que sustenta e contribui?"
        ],
        "espiritual": [
            "Qual é o propósito que alinha minha alma, meu talento e meu serviço ao mundo?",
            "O que minha essência ama e como ela pode servir ao mundo de forma autêntica?",
            "Onde meu dom espiritual encontra a necessidade ao meu redor?",
            "O que as cartas revelam sobre o encontro entre minha missão interior e minha expressão exterior?",
            "Como posso viver com mais sentido ao integrar paixão, talento, vocação e sustento?"
        ],
        "amor": [
            "Como o que amo, o que sei fazer, o que ofereço e o que recebo se equilibram nas minhas relações?",
            "O que o Ikigai revela sobre o que busco e o que dou nos meus relacionamentos?",
            "Onde meu amor e meu propósito se encontram — e onde ainda há desalinhamento?",
            "O que meu coração ama e meu ser sabe fazer que pode nutrir melhor os meus vínculos?",
            "Como posso trazer mais autenticidade ao amor integrando quem sou com o que ofereço?"
        ]
    },

    // ── MAPA DO LUTO ──────────────────────────────────────────
    "mapa-luto": {
        "geral": [
            "O que perdi e o que esta perda está pedindo de mim agora?",
            "Como meu processo de luto está se movendo neste momento?",
            "O que ainda precisa ser reconhecido para que eu possa avançar?",
            "Que recursos estão disponíveis para me ajudar a atravessar essa perda?",
            "Para onde a energia do meu luto está me conduzindo?"
        ],
        "amor": [
            "O que este término realmente me tirou — e o que acredito ter perdido?",
            "O que sinto conscientemente sobre esta perda amorosa — e o que evito sentir?",
            "Em que fase estou neste processo de luto afetivo?",
            "Que recursos internos estão me ajudando a elaborar este amor perdido?",
            "Para onde meu coração está se movendo naturalmente depois desta ruptura?"
        ],
        "trabalho": [
            "O que esta demissão ou rebaixamento realmente me tirou — e o que acredito ter perdido?",
            "O que sinto conscientemente sobre esta perda profissional — e o que ainda evito nomear?",
            "Em que fase estou neste luto de carreira — e o que ele ainda precisa de mim?",
            "Que recursos internos ou externos estão disponíveis para me sustentar neste processo?",
            "Para onde minha energia profissional está se movendo naturalmente a partir desta perda?"
        ],
        "espiritual": [
            "O que esta perda veio me ensinar sobre mim mesmo e minha jornada?",
            "O que minha alma reconhece ter perdido — e o que ainda não quer ver?",
            "Que sentimento mais profundo esta perda está despertando em mim?",
            "Que recursos espirituais estão disponíveis para me sustentar neste processo?",
            "Para onde minha alma está sendo chamada a partir desta experiência de perda?"
        ]
    },

    // ── PÓS-RUPTURA ───────────────────────────────────────────
    "pos-ruptura": {
        "geral": [
            "Como estão os dois lados desta ruptura — por dentro e por fora — e para onde isso vai?",
            "O que ainda existe entre nós após o fim e qual o propósito desta fase?",
            "O que bloqueia e o que favorece um desfecho mais saudável para os dois?",
            "Qual a mensagem mais importante sobre esta ruptura e o que ela pede de mim agora?",
            "O que o futuro desta conexão reserva e qual o conselho central das cartas?"
        ],
        "amor": [
            "Como meu(minha) ex está sentindo, pensando e agindo — e o que isso revela sobre a relação?",
            "Que aberturas existem entre nós — para o perdão, a paz, o contato ou a retomada?",
            "O que bloqueia e o que favorece esta conexão neste momento pós-ruptura?",
            "O que esta história ainda tem para ensinar e para onde ela caminha?",
            "Qual o conselho das cartas para meu coração agora que tudo mudou?"
        ],
        "espiritual": [
            "Que propósito espiritual esta ruptura carrega para cada um de nós?",
            "O que esta separação veio curar, transformar ou revelar em nível de alma?",
            "Que bloqueios kármicos ou padrões inconscientes dificultam ou favorecem esta reconexão?",
            "Qual o aprendizado evolutivo desta conexão neste momento de ruptura?",
            "O que minha alma precisa ouvir sobre este vínculo e sobre o caminho à frente?"
        ]
    },

    // ── PÓS-CONEXÃO ───────────────────────────────────────────
    "pos-conexao": {
        "geral": [
            "O que a outra pessoa sente, pensa e carrega sobre esta conexão — e para onde isso vai?",
            "O que ficou pendente entre nós e o que ainda nos aproxima ou afasta?",
            "Qual o potencial real desta conexão e qual o propósito que ela veio cumprir?",
            "O que esta vivência significou para ela e o que a tendência futura revela?",
            "Qual o conselho central das cartas sobre esta conexão que não chegou a ser relação?"
        ],
        "amor": [
            "O que esta pessoa sente e pensa sobre o que existiu entre nós?",
            "O que ficou por dizer ou por resolver nesta conexão?",
            "O que aproxima e o que afasta — e que futuro isso desenha?",
            "O que este vínculo veio me ensinar e para onde ele pode ir?",
            "Qual o conselho do tarô para meu coração diante desta conexão incompleta?"
        ],
        "espiritual": [
            "Que propósito evolutivo esta conexão carrega para cada um de nós?",
            "O que ficou pendente em nível de alma — o que ainda precisa ser reconhecido?",
            "Que forças aproximam ou afastam nossas almas neste momento?",
            "Qual o potencial de aprofundamento desta conexão no plano espiritual?",
            "O que minha alma precisa ouvir sobre esta pessoa e sobre o que existiu entre nós?"
        ]
    },

    // ── PONTE DE RECONCILIAÇÃO ───────────────────────────────
    "ponte-reconciliacao": {
        "geral": [
            "O que cada um traz para este reencontro — e o que nos separa ainda?",
            "O que precisa ser compreendido de cada lado para que a ponte seja possível?",
            "O que bloqueia a reconciliação — e o que esta relação ainda tem a oferecer?",
            "Que gesto ou caminho pode nos aproximar de verdade?",
            "O que cada um carrega e o que ainda nos impede de nos encontrar?"
        ],
        "amor": [
            "O que eu e esta pessoa levamos para este possível reencontro?",
            "O que cada um precisa compreender para que a reconciliação seja real?",
            "O que ainda bloqueia esta reconexão — e o que ela pode oferecer?",
            "Que caminho ou gesto pode criar a ponte entre nós dois?",
            "O que esta relação ainda tem de vivo — e o que cada um precisa soltar para chegar lá?"
        ],
        "espiritual": [
            "Que energia cada alma leva para este reencontro — e o que as separa em nível profundo?",
            "O que cada um precisa compreender karmicamente para que a ponte se forme?",
            "Que obstáculo espiritual bloqueia esta reconciliação?",
            "Que potencial evolutivo existe nesta reconexão — e que caminho ela pede?",
            "O que a alma de cada um ainda precisa para que este encontro seja possível?"
        ]
    },

    // ── VÍNCULO E REPARO ─────────────────────────────────────
    "vinculo-e-reparo": {
        "geral": [
            "O que ainda nos conecta, o que terminou e o que pode ser reconstruído?",
            "O que ficou de pé entre nós — e o que precisa ficar para trás de vez?",
            "O que pode ser reparado nesta relação — e como me posicionar agora?",
            "Que padrão não deve se repetir — e para onde esta história está indo?",
            "O que sobreviveu ao fim desta relação e qual o conselho das cartas?"
        ],
        "amor": [
            "O que ainda nos une — e o que de fato ficou para trás nesta relação?",
            "O que pode ser reconstruído entre nós — e o que não deve voltar?",
            "Como devo me posicionar diante desta pessoa e do que ficou entre nós?",
            "Que padrão preciso não repetir — e para onde essa história tende a ir?",
            "O que o tarô revela sobre o fio que ainda existe entre nós e o que fazer com ele?"
        ],
        "espiritual": [
            "Que laço espiritual permanece entre nós — e o que foi realmente encerrado?",
            "O que pode ser reconstruído em nível de alma — e o que precisa ser liberado?",
            "Que padrão kármico não deve se repetir nesta conexão?",
            "Que conselho espiritual as cartas têm sobre como me posicionar diante desta pessoa?",
            "Para onde esta história caminha segundo o que ainda nos une e o que já se foi?"
        ]
    },

    // ── AMOR FUTURO ───────────────────────────────────────────
    "amor-futuro": {
        "geral": [
            "O que me impede de encontrar o amor e como posso mudar isso?",
            "O que posso fazer agora para me aproximar do amor que desejo?",
            "Como vou reconhecer e onde e quando vou encontrar essa pessoa?",
            "Que orientação o tarô tem para mim neste caminho amoroso?",
            "Que sabedoria devo carregar sobre o amor que está por vir?"
        ],
        "amor": [
            "Por que ainda não encontrei meu grande amor e como superar isso?",
            "O que posso fazer para abrir caminho para este amor chegar?",
            "Como será essa pessoa — e onde e quando nossos caminhos vão se cruzar?",
            "Qual a orientação para eu estar pronto/a quando o amor chegar?",
            "Que laço nos une e que sabedoria devo ter sobre este amor futuro?"
        ],
        "espiritual": [
            "Que bloqueio espiritual ainda me separa do amor que minha alma busca?",
            "O que minha alma precisa aprender para encontrar esta conexão?",
            "Como vou reconhecer espiritualmente essa pessoa quando ela aparecer?",
            "Que orientação interior devo seguir neste caminho para o amor?",
            "Que lição kármica este amor futuro veio trazer para minha vida?"
        ]
    },

    // ── TIRAGEM DE DECISÃO ────────────────────────────────────
    "decisao": {
        "geral": [
            "Estou diante de duas opções — o que cada caminho reserva?",
            "Devo escolher entre A e B — o que cada alternativa traz e qual é o conselho?",
            "O que considerar sobre cada opção desta escolha e para onde cada uma leva?",
            "Que energia envolve esta decisão e o que cada caminho revela?",
            "Como posso tomar esta decisão com mais clareza e consciência?"
        ],
        "amor": [
            "Devo ficar ou ir — o que cada caminho reserva para minha vida amorosa?",
            "Estou entre duas pessoas (ou dois caminhos afetivos) — o que cada um oferece?",
            "Devo dar uma nova chance ou seguir em frente — o que cada opção traz?",
            "Como cada escolha pode afetar meu coração e meu futuro afetivo?",
            "Que energia cerca esta decisão amorosa e qual a orientação final?"
        ],
        "trabalho": [
            "Devo aceitar esta proposta ou aguardar — o que cada caminho reserva?",
            "Estou entre dois projetos (ou empregos) — o que cada opção traz?",
            "Devo mudar de área ou permanecer — o que considerar em cada caminho?",
            "Como cada escolha profissional pode impactar minha carreira e bem-estar?",
            "Que energia envolve esta decisão de trabalho e qual o conselho final?"
        ],
        "espiritual": [
            "Estou em uma encruzilhada — o que cada caminho revela para minha alma?",
            "Que forças espirituais atuam em cada uma das minhas opções?",
            "O que cada escolha pode despertar ou curar em mim?",
            "Como cada caminho se alinha (ou não) com meu propósito mais profundo?",
            "Que conselho o espiritual traz para esta decisão que minha mente não consegue resolver?"
        ]
    },

    // ── MINI TABLEAU ──────────────────────────────────────────
    "grande-tableau-mini": {
        "geral": [
            "Qual o panorama geral da minha vida neste momento?",
            "O que as nove casas revelam sobre esta situação?",
            "Como está o campo de energia ao redor desta questão?",
            "O que está nas origens, no centro e no desfecho disso tudo?",
            "Que forças estão atuando no passado, presente e futuro desta situação?"
        ],
        "amor": [
            "Qual o panorama completo da minha vida amorosa agora?",
            "O que as nove casas revelam sobre este relacionamento?",
            "Que forças atuam no passado, presente e futuro desta relação?",
            "Como está o campo afetivo ao meu redor neste momento?",
            "O que está na origem, no centro e no destino desta situação amorosa?"
        ],
        "trabalho": [
            "Qual o panorama completo da minha situação profissional?",
            "O que as nove casas revelam sobre esta fase da carreira?",
            "Que forças atuam ao redor deste projeto ou decisão?",
            "Como está o campo profissional ao meu redor neste momento?",
            "O que está na origem, no centro e no destino desta questão de trabalho?"
        ],
        "espiritual": [
            "Qual o panorama espiritual da minha vida neste momento?",
            "O que as nove casas revelam sobre meu processo interior?",
            "Que forças atuam ao redor da minha jornada de autoconhecimento?",
            "Como está o campo energético ao meu redor agora?",
            "O que está na origem, no centro e no destino da minha evolução?"
        ]
    },

    // ── CICLO DE EXPERIÊNCIA — GESTALT ───────────────────────
    "ciclo-gestalt": {
        "geral": [
            "Como estou vivendo esta situação — da sensação à integração?",
            "Onde estou travado neste ciclo de experiência — e o que está pedindo para se completar?",
            "O que meu organismo sente, precisa e quer fazer — e o que bloqueia esse movimento?",
            "Que experiência estou carregando inacabada — e o que ela precisa para se fechar?",
            "O que emerge, o que mobiliza, onde trava e o que pode ser integrado agora?"
        ],
        "amor": [
            "Como estou vivendo este relacionamento — da sensação bruta à integração?",
            "Onde o ciclo afetivo está interrompido — e o que meu organismo realmente precisa?",
            "O que sinto, percebo e quero — e o que bloqueia o contato genuíno com esta pessoa?",
            "Que necessidade afetiva ainda não foi atendida — e o que impede que ela seja?",
            "O que este ciclo amoroso pede para se completar — e o que posso integrar agora?"
        ],
        "trabalho": [
            "Como estou vivendo esta situação profissional — do impulso à integração?",
            "O que meu organismo sente e precisa neste contexto de trabalho?",
            "Onde o ciclo de ação está travado — e o que impede o contato com o que quero fazer?",
            "Que necessidade profissional ainda não reconheci — e o que bloqueia sua expressão?",
            "O que este ciclo de trabalho pede para se completar — e o que posso assimilar agora?"
        ],
        "espiritual": [
            "Como estou vivendo este processo interior — da sensação à integração?",
            "O que minha alma está sinalizando — e o que ainda não emergiu para a consciência?",
            "Que necessidade espiritual está pedindo atenção — e o que bloqueia seu atendimento?",
            "Onde o ciclo de transformação está interrompido em mim agora?",
            "O que pode ser integrado e liberado neste ciclo para que o próximo possa começar?"
        ]
    },

    // ── MAPA DOS CHAKRAS ──────────────────────────────────────
    "chakras": {
        "geral": [
            "Como estão meus centros energéticos neste momento?",
            "Que chakras pedem atenção e cura agora?",
            "Qual a mensagem de cada centro energético para esta fase da minha vida?",
            "Como está o fluxo de energia do meu corpo e do meu campo?",
            "O que cada chakra revela sobre meu estado atual de ser?"
        ],
        "amor": [
            "Como meus centros energéticos estão influenciando minha vida amorosa?",
            "Que chakras precisam de atenção para eu me abrir mais ao amor?",
            "O que cada centro revela sobre minha capacidade de me conectar e amar?",
            "Como está o chakra cardíaco e os demais em relação aos meus vínculos?",
            "Que bloqueios energéticos afetam minha vida afetiva e como superá-los?"
        ],
        "trabalho": [
            "Como meus centros energéticos influenciam minha expressão e carreira?",
            "Que chakras precisam de equilíbrio para eu avançar profissionalmente?",
            "O que cada centro revela sobre minha relação com trabalho e propósito?",
            "Como está o fluxo energético que sustenta minha realização profissional?",
            "Que bloqueios energéticos limitam minha expressão e poder de ação?"
        ],
        "espiritual": [
            "Como estão meus centros energéticos na minha jornada espiritual?",
            "Que chakras pedem integração e cura para meu avanço interior?",
            "O que cada centro revela sobre meu alinhamento espiritual agora?",
            "Como está o fluxo de kundalini e energia sutil no meu campo?",
            "Que lições cada chakra carrega para este ciclo de evolução?"
        ]
    },

    // ── MANDALA ASTROLÓGICA ───────────────────────────────────
    "mandala-astrologica": {
        "geral": [
            "Qual a mensagem das doze casas para minha vida agora?",
            "Como estão as diferentes áreas da minha vida neste momento?",
            "O que o mapa das doze casas revela sobre este ciclo da minha vida?",
            "Qual a leitura completa da minha mandala de vida neste momento?",
            "O que cada área da minha vida tem a me dizer agora?"
        ],
        "amor": [
            "Como o amor e os relacionamentos permeiam todas as áreas da minha vida?",
            "Que mensagem as doze casas têm sobre minha vida amorosa e afetiva?",
            "Como está minha capacidade de amar e me conectar em cada esfera?",
            "O que a mandala revela sobre meus padrões nos relacionamentos?",
            "Que lições afetivas estão presentes em cada casa da minha vida agora?"
        ],
        "trabalho": [
            "Que mensagem as doze casas têm sobre minha trajetória profissional?",
            "Como a carreira e o propósito permeiam todas as áreas da minha vida?",
            "O que a mandala revela sobre minha relação com o trabalho e o sucesso?",
            "Como está minha energia de realização em cada esfera da vida?",
            "Que lições profissionais estão presentes em cada casa agora?"
        ],
        "espiritual": [
            "Que mensagem as doze casas têm sobre meu caminho espiritual?",
            "Como o autoconhecimento permeia todas as áreas da minha vida?",
            "O que a mandala revela sobre meu propósito neste ciclo?",
            "Como está minha conexão espiritual em cada esfera da vida?",
            "Que lições de alma estão presentes em cada casa agora?"
        ]
    }

};

// =============================================================
//  BANCO DE SUGESTÕES POR SISTEMA
//
//  Tem prioridade sobre PERGUNTAS_SUGERIDAS acima (ver obterSugestoes
//  em main.js). Use quando um sistema tem um "jeito de perguntar"
//  próprio, independente da tiragem escolhida — é o caso das Runas,
//  que respondem melhor a perguntas de força/energia/timing do que
//  a perguntas narrativas de enredo (essas seguem sendo melhor
//  cobertas por Tarot, Lenormand, Sibilla e Kipper).
// =============================================================
window.PERGUNTAS_SUGERIDAS_SISTEMA = {

    "runas": {
        "geral": [
            "Que força eu preciso mobilizar agora?",
            "O que está me bloqueando por dentro?",
            "Devo agir ou é hora de esperar?",
            "Que energia está regendo esta fase da minha vida?",
            "O que essa situação está me pedindo pra eu enfrentar?"
        ],
        "amor": [
            "Que energia rege esse vínculo agora?",
            "O que eu preciso fortalecer dentro de mim para essa relação crescer?",
            "Estou dando espaço de verdade ou segurando com medo?",
            "Que força emocional preciso equilibrar nesse relacionamento?",
            "O que essa conexão está me pedindo pra eu deixar ir?"
        ],
        "trabalho": [
            "Que força eu preciso reunir para essa fase profissional?",
            "É hora de agir ou de esperar o momento certo?",
            "O que está travando meu crescimento por dentro, não por fora?",
            "Que resistência eu preciso enfrentar pra destravar esse projeto?",
            "Estou colhendo no tempo certo ou plantando ainda?"
        ],
        "espiritual": [
            "Que força ancestral ou interior está pedindo atenção agora?",
            "O que eu preciso deixar morrer para renascer diferente?",
            "Que proteção eu preciso invocar neste momento?",
            "Estou em ciclo de pausa ou de ação — e estou respeitando isso?",
            "Que verdade sobre mim mesmo essa fase está revelando?"
        ]
    }

};
