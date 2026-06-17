require("dotenv").config()
// le o ficheiro .env e coloca as variaveis em process.env
const express = require("express")
// Importa a biblioteca Express, usada para criar o servidor web.

const app = express()
// Cria uma aplicação Express e guarda-a na constante app.

app.use(express.json())
// Permite ao servidor receber dados em formato JSON no corpo dos pedidos.

const mysql = require("mysql2/promise")
//Importar a biblioteca mysql2 que é responsável por configurar e ligar a BD ao nosso servidor

const PORT = Number(process.env.PORT || 3000)
// Define a porta em que o servidor vai receber pedidos.

// Pool = "Conjunto de ligações" ao MySQL já abertas e prontas a usar.
const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
})

// Acrescentar nas rodas que tem body, como PUT e POST "validarFilme"
// MIDDLEWARE
// Um middleware e uma funcao que corre ENTRE o pedido e a rota.
//
//   pedido --> middleware 1 --> middleware 2 --> rota --> resposta
//
// Forma de um middleware:
//
//   function nome(req, res, next) {
//     // ... fazer alguma coisa ...
//     next();   // continua para o proximo passo
//   }
//
// Regra: ou chamamos next() para continuar,
//        ou respondemos com res.json(...) e paramos aqui.

// No terminal, aparece a hora das ações
app.use((req, res, next) => {
  const hora = new Date().toLocaleTimeString("pt-PT")
  console.log(`[${hora}] ${req.method} ${req.url}`)
  next()
})

function validarFilme(req, res, next) {
  const generosValidos = ["acao", "comedia", "drama", "terror", "ficcao", "documentario", "animacao", "outro"]
  const tiposValidos = ["filme", "serie"]
  const { titulo, realizador, genero, ano, tipo, avaliacao } = req.body

  const tituloLimpo = String(titulo || "").trim()
  const realizadorLimpo = String(realizador || "").trim()
  const generoLimpo = String(genero || "").trim().toLowerCase()
  const tipoLimpo = String(tipo || "").trim().toLowerCase()
  const anoNumero = Number(ano)
  const avaliacaoNumero = avaliacao === undefined || avaliacao === null || avaliacao === "" ? null : Number(avaliacao)
  const anoAtual = new Date().getFullYear()

  if (tituloLimpo.length < 2 || tituloLimpo.length > 200) {
    return res.status(400).json({ erro: "Título obrigatório (entre 2 e 200 caracteres)" })
  }
  if (realizadorLimpo.length === 0 || realizadorLimpo.length > 200) {
    return res.status(400).json({ erro: "Realizador obrigatório (entre 1 e 200 caracteres)" })
  }
  if (!generosValidos.includes(generoLimpo)) {
    return res.status(400).json({ erro: "Genero inválido" })
  }
  if (!Number.isInteger(anoNumero) || anoNumero < 1900 || anoNumero > anoAtual) {
    return res.status(400).json({ erro: `Ano inválido (entre 1900 e ${anoAtual})` })
  }
  if (!tiposValidos.includes(tipoLimpo)) {
    return res.status(400).json({ erro: "Tipo inválido" })
  }
  if (avaliacaoNumero !== null && (!Number.isInteger(avaliacaoNumero) || avaliacaoNumero < 1 || avaliacaoNumero > 5)) {
    return res.status(400).json({ erro: "Avaliação inválida (entre 1 e 5)" })
  }

  req.body = {
    titulo: tituloLimpo,
    realizador: realizadorLimpo,
    genero: generoLimpo,
    ano: anoNumero,
    tipo: tipoLimpo,
    avaliacao: avaliacaoNumero,
  }
  next()
}

//| GET | `/api/estado` | Verificar se a API esta ativa | 200 |

app.get("/api/estado", (req, res) => {
  // Cria uma rota GET para confirmar que a API está ativa.
  res.status(200).json({ mensagem: "API ativa" })
  // Envia uma resposta simples ao cliente.
})

//| GET | `/api/filmes` | Listar todos os filmes/series | 200 |

app.get("/api/filmes", async (req, res) => {
  // Cria uma rota GET para listar todos os filmes/series.
  const query = "SELECT * FROM filmes"
  // Define a query SQL que vai buscar todos os registos da tabela filmes.
  const [resposta] = await pool.execute(query)
  // Executa a query na base de dados e guarda o resultado em resposta.
  console.log(resposta)
  // Mostra no terminal a lista de filmes encontrada.
  res.status(200).json(resposta)
  // Envia a resposta ao cliente com o código 200 e os dados em JSON.
})

//| GET | `/api/filmes/:id` | Obter filme/serie por ID | 200 / 404 |

app.get("/api/filmes/:id", async (req, res) => {
  // Cria uma rota GET para procurar um filme específico pelo ID.
  const id = Number(req.params.id)
  // Vai buscar o ID escrito no endereço e transforma-o em número.
  const query = "SELECT * FROM filmes WHERE id = ?"
  // Define a query SQL para procurar um filme com o ID indicado.
  const [filme] = await pool.execute(query, [id])
  // Executa a query, substituindo o ponto de interrogação pelo ID.
  if (filme.length === 0) {
    // Verifica se nenhum filme foi encontrado.
    return res.status(404).json({ mensagem: "Este filme não existe!" })
    // Responde com erro 404 quando o filme não existe.
  }

  res.status(200).json(filme[0])
  // Envia o filme encontrado com o código 200.
})

// | POST | `/api/filmes` | Adicionar novo filme/serie | 201 / 400 |

app.post("/api/filmes", validarFilme, async (req, res) => {
  // Cria uma rota POST para adicionar um novo filme/serie.
  const { titulo, realizador, genero, ano, tipo, avaliacao } = req.body
  // Retira do corpo do pedido os dados enviados pelo cliente.
  if (!titulo || !realizador || !genero || !ano || !tipo) {
    // Verifica se algum campo obrigatório ficou vazio.
    return res.status(400).json({ erro: "Preencher campos obrigatórios" })
    // Responde com erro 400 quando faltam dados.
  }
  const query = "INSERT INTO filmes (titulo, realizador, genero, ano, tipo, avaliacao) VALUES (?,?,?,?,?,?)"
  // Define a query SQL para inserir um novo filme na base de dados.
  const [resposta] = await pool.execute(query, [titulo, realizador, genero, ano, tipo, avaliacao])
  // Executa a query com os dados recebidos.
  res.status(201).json({
    mensagem: "Filme criado com sucesso!",
    id: resposta.insertId,
    dados: {
      id: resposta.insertId,
      titulo,
      realizador,
      genero,
      ano,
      tipo,
      avaliacao,
      visto: false,
    },
  })
  // Responde com código 201 e devolve o ID do filme criado.
})

// | PUT | `/api/filmes/:id` | Atualizar filme/serie | 200 / 404 / 400 |

app.put("/api/filmes/:id", validarFilme, async (req, res) => {
  // Cria uma rota PUT para atualizar todos os dados de um filme.
  const id = Number(req.params.id)
  // Vai buscar o ID escrito no endereço e transforma-o em número.
  const query = "SELECT * FROM filmes WHERE id = ?"
  // Define a query SQL para verificar se o filme existe.
  const [filme] = await pool.execute(query, [id])
  // Executa a query usando o ID recebido.
  if (filme.length === 0) {
    // Verifica se o filme não foi encontrado.
    return res.status(404).json({ mensagem: "Este filme não existe!" })
    // Responde com erro 404 quando não existe filme com esse ID.
  }
  const { titulo, realizador, genero, ano, tipo, avaliacao } = req.body
  // Retira do corpo do pedido os novos dados do filme.
  if (!titulo || !realizador || !genero || !ano || !tipo) {
    // Verifica se todos os campos obrigatórios foram preenchidos.
    return res.status(400).json({ erro: "Preencher campos obrigatórios" })
    // Responde com erro 400 quando faltam dados.
  }
  const query2 = "UPDATE filmes SET titulo = ?, realizador = ?, genero = ?, ano = ?, tipo = ?, avaliacao = ? WHERE id = ?"
  // Define a query SQL para alterar o filme escolhido.
  await pool.execute(query2, [titulo, realizador, genero, ano, tipo, avaliacao, id])
  // Executa a atualização na base de dados.

  res.status(200).json({
    // Envia uma resposta de sucesso com os dados atualizados.
    mensagem: "Filme alterado com sucesso",
    dados: {
      id,
      titulo,
      realizador,
      genero,
      ano,
      tipo,
      avaliacao,
      visto: filme[0].visto,
    },
  })
})

//| PATCH | `/api/filmes/:id/visto` | Alternar visto | 200 / 404 |

app.patch("/api/filmes/:id/visto", async (req, res) => {
  // Cria uma rota PATCH para mudar apenas o estado de visto de um filme.
  const id = Number(req.params.id)
  // Vai buscar o ID escrito no endereço e transforma-o em número.
  const query = "SELECT * FROM filmes WHERE id = ?"
  // Define a query SQL para procurar o filme pelo ID.
  const [filme] = await pool.execute(query, [id])
  // Executa a query na base de dados.
  if (filme.length === 0) {
    // Verifica se o filme não foi encontrado.
    return res.status(404).json({ mensagem: "Filme não existe!" })
    // Responde com erro 404 quando o filme não existe.
  }
  console.log(filme[0].visto)
  // Mostra no terminal o valor atual do campo visto.

  const novoValor = !filme[0].visto
  // Inverte o valor atual de visto: true passa para false e false passa para true.
  const query2 = "UPDATE filmes SET visto = ? WHERE id = ?"
  // Define a query SQL para atualizar apenas o campo visto.
  await pool.execute(query2, [novoValor, id])
  // Executa a atualização na base de dados.

  res.status(200).json({
    mensagem: "Visto alterado com sucesso",
    dados: {
      ...filme[0],
      visto: novoValor,
    },
  })
  // Envia uma resposta de sucesso ao cliente.
})

// | DELETE | `/api/filmes/:id` | Apagar filme/serie | 204 / 404 |

app.delete("/api/filmes/:id", async (req, res) => {
  const id = Number(req.params.id)
  const query = "SELECT * FROM filmes WHERE id = ?"
  const [filme] = await pool.execute(query, [id])
  if (filme.length === 0) {
    return res.status(404).json({ erro: "filme não encontrado" })
  }

  const query2 = "DELETE FROM filmes WHERE id = ?"
  await pool.execute(query2, [id])

  res.status(200).json({mensagem: "filme eliminado com sucesso!"})
  })


// ------------------------------------------------------------
// ROTA 404
// ------------------------------------------------------------
//
// Esta rota fica depois de todas as outras.
// Se o pedido chegou aqui, e porque nenhuma rota anterior correspondeu.
// Se a roda nao existir, enviar para esse codigo

app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada" })
})

// ------------------------------------------------------------
// ERROR HANDLER GLOBAL
// ------------------------------------------------------------
//
// E um middleware especial com 4 parametros: (erro, req, res, next).
// O Express usa este sempre que uma rota async deita um erro.
// Assim nao precisamos de try/catch em cada rota.

app.use((erro, req, res, next) => {
  console.log("Erro: ", erro.message)
  res.status(500).json({ erro: "Erro no servidor!" })
})

// PROCESSO ASSINCRONO- aguarda por resonda da base de dados
app.listen(PORT, async () => {
  // Inicia o servidor e espera pedidos na porta definida.
  console.log(`O servidor está a rolar na porta ${PORT}`)
  // Mostra no terminal que o servidor começou a funcionar.
  try {
    // Tenta confirmar se a ligação à base de dados está a funcionar.
    await pool.execute("SELECT 1")
    // Executa uma query simples para testar a ligação ao MySQL.
    console.log("Ligada à base de dados")
    // Mostra no terminal que a base de dados está ligada.
  } catch (error) {
    // Caso aconteça algum erro na ligação à base de dados, entra aqui.
    console.log(error)
    // Mostra o erro no terminal.
  }
})

