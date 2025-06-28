// server.js

// Importa os módulos necessários
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// Cria uma instância do aplicativo Express
const app = express();
const PORT = 3000;

// Configura os middlewares para o aplicativo Express
// Habilita o CORS para permitir que o frontend (rodando em outra origem/porta) se comunique com o backend
// Permite TODAS as origens para facilitar a depuração. Em produção, você deve especificar `origin: 'https://panico55.github.io'`.
app.use(cors()); 
app.use(express.json()); // Permite que o Express entenda requisições com corpo no formato JSON

// Conecta ao banco de dados SQLite
// O arquivo 'votos.db' será criado na mesma pasta onde server.js está sendo executado se não existir.
const db = new sqlite3.Database('./votos.db', (err) => {
    if (err) {
        // Se houver um erro ao tentar conectar ao banco de dados, loga o erro
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');

        // **** TABELA ÚNICA: users_votes (COM CAMPO 'telefone' e 'email' UNIQUE) ****
        // client_id é AUTOINCREMENT para ID sequencial
        db.run(`CREATE TABLE IF NOT EXISTS users_votes (
            client_id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            email TEXT UNIQUE,            -- E-mail deve ser único
            telefone TEXT UNIQUE,         -- Telefone também deve ser único
            team_vote TEXT,
            tech_vote TEXT,
            data_registro DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela users_votes:', err.message);
            } else {
                console.log('Tabela "users_votes" verificada/criada.');
            }
        });
    }
});

// --- Rota: Obter um Client ID Sequencial ---
// Esta rota é chamada pelo frontend para obter um novo client_id incremental.
app.post('/get-client-id', (req, res) => {
    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');

        // Insere uma nova linha na tabela para gerar um novo client_id auto-incrementado.
        // Os outros campos ficam NULL por enquanto.
        db.run(`INSERT INTO users_votes DEFAULT VALUES`, function(err) {
            if (err) {
                db.run('ROLLBACK;', () => {
                    console.error('Erro ao gerar novo client_id:', err.message);
                    return res.status(500).json({ message: 'Erro ao gerar novo ID de cliente.' });
                });
                return;
            }
            // 'this.lastID' contém o ID da última linha inserida (o novo client_id)
            const newClientId = this.lastID;

            db.run('COMMIT;', (commitErr) => {
                if (commitErr) {
                    console.error('Erro no commit da transação (get-client-id):', commitErr.message);
                    return res.status(500).json({ message: 'Erro interno ao finalizar geração de ID.' });
                }
                console.log(`Novo client_id sequencial gerado: ${newClientId}`);
                res.status(200).json({ client_id: newClientId });
            });
        });
    });
});


// --- Rota: Registrar um Voto de Time ---
// Recebe o client_id e o team_vote.
// Ele ATUALIZA o team_vote para o client_id existente.
app.post('/votar', (req, res) => {
    const { time, client_id } = req.body;

    if (!time || !client_id) {
        return res.status(400).json({ message: 'Time ou ID do cliente não fornecido.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');

        // Tenta atualizar o team_vote para o client_id existente.
        const updateVoteSql = `UPDATE users_votes SET team_vote = ? WHERE client_id = ?`;
        db.run(updateVoteSql, [time, client_id], function(err) {
            if (err) {
                db.run('ROLLBACK;', () => {
                    console.error('Erro ao atualizar voto de time:', err.message);
                    return res.status(500).json({ message: 'Erro ao registrar voto de time.' });
                });
                return;
            }

            if (this.changes === 0) { // Se 0 mudanças, client_id não existe, algo deu errado
                db.run('ROLLBACK;', () => {
                    console.warn(`Tentativa de voto de time para client_id inexistente: ${client_id}`);
                    return res.status(404).json({ message: 'Client ID não encontrado para registrar voto de time.' });
                });
                return;
            }
            
            db.run('COMMIT;', (commitErr) => {
                if (commitErr) {
                    console.error('Erro no commit da transação (times):', commitErr.message);
                    return res.status(500).json({ message: 'Erro interno ao finalizar voto de time.' });
                }
                console.log(`Voto de time registrado para: ${time}. Cliente ID: ${client_id}`); 
                res.status(200).json({ message: 'Voto de time registrado com sucesso!', timeVotado: time, client_id: client_id });
            });
        });
    });
});

// --- Rota: Registrar um Voto de Tecnologia ---
// Recebe o client_id e o tech_name. ATUALIZA o campo tech_vote para o client_id existente.
// Adicionada lógica de voto único por e-mail (tech_vote)
app.post('/vote-tech', (req, res) => {
    const { tech_name, client_id } = req.body;

    if (!tech_name || !client_id) {
        return res.status(400).json({ message: 'Nome da tecnologia ou ID do cliente não fornecido.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');

        // Verifica se o usuário JÁ VOTOU em tecnologia para este client_id
        db.get(`SELECT tech_vote FROM users_votes WHERE client_id = ?`, [client_id], (err, row) => {
            if (err) {
                db.run('ROLLBACK;', () => {
                    console.error('Erro ao verificar voto de tecnologia existente:', err.message);
                    return res.status(500).json({ message: 'Erro interno ao verificar voto anterior.' });
                });
                return;
            }

            if (!row) { // client_id não existe na tabela users_votes, algo deu errado no fluxo
                db.run('ROLLBACK;', () => {
                    console.warn(`Tentativa de voto de tecnologia para client_id inexistente: ${client_id}`);
                    return res.status(404).json({ message: 'Client ID não encontrado para registrar voto de tecnologia.' });
                });
                return;
            }

            if (row.tech_vote) { // Se tech_vote já tem um valor, o cliente já votou
                db.run('ROLLBACK;', () => {
                    console.warn(`Cliente ${client_id} já votou nesta enquete de tecnologia.`);
                    return res.status(409).json({ message: 'Você já votou nesta enquete de tecnologia.' });
                });
                return;
            }

            // ATUALIZA o tech_vote para o client_id.
            const updateTechVoteSql = `UPDATE users_votes SET tech_vote = ? WHERE client_id = ?`;
            db.run(updateTechVoteSql, [tech_name, client_id], function(err) {
                if (err) {
                    db.run('ROLLBACK;', () => {
                        console.error('Erro ao atualizar voto de tecnologia:', err.message);
                        return res.status(500).json({ message: 'Erro interno ao registrar voto.' });
                    });
                    return;
                }

                db.run('COMMIT;', (commitErr) => {
                    if (commitErr) {
                        console.error('Erro no commit da transação (tech):', commitErr.message);
                        return res.status(500).json({ message: 'Erro interno ao finalizar voto.' });
                    }
                    console.log(`Voto de tecnologia registrado para: ${tech_name}. Cliente ID: ${client_id}`);
                    res.status(200).json({ message: 'Voto de tecnologia registrado com sucesso!', techVoted: tech_name, client_id: client_id });
                });
            });
        });
    });
});


// --- Rota: Registrar Dados do Cliente ---
// Recebe client_id, nome, email e TELEFONE.
// ATUALIZA os campos nome, email e TELEFONE para o client_id existente.
app.post('/register-client', (req, res) => {
    const { client_id, nome, email, telefone } = req.body; // **** NOVO: telefone no body ****

    // **** VALIDAÇÃO: Todos os campos são obrigatórios agora ****
    if (!client_id || !nome || !email || !telefone) {
        return res.status(400).json({ message: 'Dados do cliente incompletos: nome, e-mail e telefone são obrigatórios.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');

        // Verifica se o client_id existe antes de tentar atualizar
        db.get(`SELECT client_id FROM users_votes WHERE client_id = ?`, [client_id], (err, row) => {
            if (err) {
                db.run('ROLLBACK;', () => {
                    console.error('Erro ao verificar client_id para cadastro:', err.message);
                    return res.status(500).json({ message: 'Erro interno ao registrar cliente.' });
                });
                return;
            }
            if (!row) { // client_id não encontrado
                db.run('ROLLBACK;', () => {
                    console.warn(`Tentativa de cadastro para client_id inexistente: ${client_id}`);
                    return res.status(404).json({ message: 'Client ID não encontrado para cadastro.' });
                });
                return;
            }

            // ATUALIZA os campos nome, email e TELEFONE para o client_id existente.
            // A verificação de unicidade de email e telefone será feita pelas constraints do DB.
            const updateClientSql = `UPDATE users_votes SET nome = ?, email = ?, telefone = ? WHERE client_id = ?`;
            db.run(updateClientSql, [nome, email, telefone, client_id], function(err) { // **** NOVO: telefone no array ****
                if (err) {
                    db.run('ROLLBACK;', () => {
                        console.error('Erro ao atualizar dados do cliente:', err.message);
                        // **** TRATAMENTO DE ERRO PARA DUPLICIDADE DE EMAIL OU TELEFONE ****
                        if (err.message.includes('SQLITE_CONSTRAINT: UNIQUE constraint failed: users_votes.email') ||
                            err.message.includes('SQLITE_CONSTRAINT: UNIQUE constraint failed: users_votes.telefone')) {
                            // Mensagem para o frontend saber que é um usuário existente
                            return res.status(409).json({ message: 'Usuário já existente, e-mail ou telefone já cadastrado.' });
                        }
                        return res.status(500).json({ message: 'Erro ao registrar cliente.' });
                    });
                    return;
                }
                
                db.run('COMMIT;', (commitErr) => {
                    if (commitErr) {
                        console.error('Erro no commit da transação (client):', commitErr.message);
                        return res.status(500).json({ message: 'Erro interno ao finalizar cadastro.' });
                    }
                    console.log(`Cliente registrado/atualizado: ID ${client_id}, Nome ${nome}, E-mail ${email}, Telefone ${telefone}`);
                    res.status(200).json({ message: 'Cliente registrado com sucesso!', client_id: client_id });
                });
            });
        });
    });
});

// --- Rota para Obter Resultados Agregados de Votos de Times ---
// Conta quantos votos cada time recebeu na coluna 'team_vote'.
app.get('/votos-times-results', (req, res) => {
    const sql = `SELECT team_vote, COUNT(*) AS total_votos FROM users_votes WHERE team_vote IS NOT NULL GROUP BY team_vote ORDER BY total_votos DESC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar resultados de times:', err.message);
            return res.status(500).json({ message: 'Erro ao buscar resultados de times.' });
        }
        res.status(200).json({ teamVotes: rows });
    });
});

// --- Rota para Obter Resultados Agregados de Votos de Tecnologia ---
// Conta quantos votos cada tecnologia recebeu na coluna 'tech_vote'.
app.get('/votos-tech-results', (req, res) => {
    const sql = `SELECT tech_vote, COUNT(*) AS total_votos FROM users_votes WHERE tech_vote IS NOT NULL GROUP BY tech_vote ORDER BY total_votos DESC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar resultados de tecnologia:', err.message);
            return res.status(500).json({ message: 'Erro ao buscar resultados de tecnologia.' });
        }
        res.status(200).json({ techVotes: rows });
    });
});

// --- Rota para Verificar se o Cliente Já Está Cadastrado ---
// (Agora verifica se o cliente tem nome, email E telefone para ser considerado "cadastrado")
app.get('/check-client/:client_id', (req, res) => {
    const { client_id } = req.params;
    db.get(`SELECT client_id, nome, email, telefone FROM users_votes WHERE client_id = ?`, [client_id], (err, row) => {
        if (err) {
            console.error('Erro ao verificar cadastro do cliente:', err.message);
            return res.status(500).json({ message: 'Erro ao verificar cadastro.' });
        }
        // Considera "cadastrado" se tiver nome, email e telefone preenchidos
        if (row && row.nome && row.email && row.telefone) { 
            res.status(200).json({ isRegistered: true, clientData: { nome: row.nome, email: row.email, telefone: row.telefone } });
        } else {
            res.status(200).json({ isRegistered: false });
        }
    });
});


// Inicia o servidor e o faz escutar por requisições na porta definida
app.listen(PORT, () => {
    console.log(`Servidor backend rodando em http://localhost:${PORT}`);
});

// Lida com o encerramento do processo (Ctrl+C) para fechar a conexão com o banco de dados
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Conexão com o banco de dados SQLite fechada.');
        process.exit(0);
    });
});
