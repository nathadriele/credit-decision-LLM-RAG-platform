# Guia Completo de Teste - Streamlit Credit Decision Platform

## Como Testar Localmente via Terminal/Navegador

### **Opção 1: Teste Rápido com Docker (Recomendado)**

#### 1. **Preparação do Ambiente**
```bash
# 1. Clone/navegue para o diretório do projeto
cd credit-decision-llm-rag

# 2. Verifique se o Docker está rodando
docker --version
docker-compose --version

# 3. Configure variáveis de ambiente (opcional para demo)
cp .env.development .env
# Edite .env e adicione sua OPENAI_API_KEY se tiver
```

#### 2. **Iniciar Streamlit com Script Automatizado**
```bash
# Tornar o script executável
chmod +x scripts/start-streamlit.sh

# Iniciar apenas Streamlit + dependências mínimas (RECOMENDADO)
./scripts/start-streamlit.sh streamlit-only

# OU iniciar plataforma completa
./scripts/start-streamlit.sh full
```

#### 3. **Acesso via Navegador**
```bash
# Abrir automaticamente no navegador
open http://localhost:8501  # macOS
xdg-open http://localhost:8501  # Linux
start http://localhost:8501  # Windows

# Ou simplesmente navegar para:
# http://localhost:8501
```

### **Opção 2: Teste Manual com Docker Compose**

```bash
# 1. Iniciar serviços necessários
docker-compose up -d postgres redis api streamlit

# 2. Verificar status dos serviços
docker-compose ps

# 3. Verificar logs do Streamlit
docker-compose logs -f streamlit

# 4. Testar conectividade
curl http://localhost:8501/_stcore/health
```

### **Opção 3: Teste Local com Python**

```bash
# 1. Navegar para diretório do Streamlit
cd streamlit_app

# 2. Criar ambiente virtual
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate  # Windows

# 3. Instalar dependências
pip install -r requirements.txt

# 4. Configurar variáveis de ambiente
export API_BASE_URL=http://localhost:3001
export OPENAI_API_KEY=your-key-here  # opcional

# 5. Iniciar Streamlit
streamlit run app.py --server.port=8501

# 6. Abrir no navegador
# http://localhost:8501
```

## **Credenciais de Teste**

### **Usuários Demo Disponíveis:**
```
Administrador:
Email: admin@creditdecision.com
Senha: admin123

Analista de Crédito:
Email: analyst@creditdecision.com
Senha: analyst123
```

## **Cenários de Teste**

### **1. Teste de Login e Navegação**
```bash
# 1. Acesse http://localhost:8501
# 2. Faça login com credenciais demo
# 3. Navegue pelas páginas:
#    - Dashboard (métricas e gráficos)
#    - RAG Explorer (busca de documentos)
#    - Model Testing (em desenvolvimento)
#    - Risk Analysis (em desenvolvimento)
#    - Reports (em desenvolvimento)
```

### **2. Teste do Dashboard**
```bash
# No Dashboard, verifique:
# ✅ Métricas principais (KPIs)
# ✅ Gráficos interativos
# ✅ Filtros funcionais
# ✅ Dados em tempo real (simulados)
# ✅ Responsividade da interface
```

### **3. Teste do RAG Explorer**
```bash
# No RAG Explorer, teste:
# ✅ Fazer perguntas sobre políticas de crédito
# ✅ Explorar diferentes coleções de documentos
# ✅ Usar contexto de conversação
# ✅ Ajustar configurações avançadas
# ✅ Visualizar fontes e metadados

# Perguntas de exemplo para testar:
# - "What is the minimum credit score for personal loans?"
# - "What are the risk assessment criteria?"
# - "How is debt-to-income ratio calculated?"
```

## **Comandos de Verificação via Terminal**

### **Verificar Status dos Serviços**
```bash
# Status geral
docker-compose ps

# Logs específicos
docker-compose logs streamlit
docker-compose logs api
docker-compose logs postgres

# Health checks
curl -f http://localhost:8501/_stcore/health
curl -f http://localhost:3001/health
curl -f http://localhost:5432  # PostgreSQL
```

### **Teste de API Integration**
```bash
# Testar login via API
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@creditdecision.com","password":"admin123"}'

# Testar health check
curl http://localhost:3001/health

# Testar métricas
curl http://localhost:3001/metrics
```

### **Monitoramento de Performance**
```bash
# Uso de recursos
docker stats

# Logs em tempo real
docker-compose logs -f --tail=50 streamlit

# Verificar conectividade de rede
docker network ls
docker network inspect credit-decision-llm-rag_credit-decision-network
```

## **Troubleshooting**

### **Problemas Comuns e Soluções**

#### **1. Streamlit não inicia**
```bash
# Verificar logs
docker-compose logs streamlit

# Reconstruir imagem
docker-compose build streamlit
docker-compose up -d streamlit

# Verificar portas
netstat -tulpn | grep 8501
```

#### **2. Erro de conexão com API**
```bash
# Verificar se API está rodando
curl http://localhost:3001/health

# Verificar rede Docker
docker network inspect credit-decision-llm-rag_credit-decision-network

# Reiniciar serviços
docker-compose restart api streamlit
```

#### **3. Problemas de autenticação**
```bash
# Verificar se está em modo demo
# Procurar por "DEMO MODE" na sidebar

# Testar credenciais manualmente
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@creditdecision.com","password":"admin123"}'
```

#### **4. Dependências Python em falta**
```bash
# Reconstruir imagem Streamlit
docker-compose build --no-cache streamlit

# Ou instalar localmente
cd streamlit_app
pip install -r requirements.txt
```

## **Funcionalidades Testáveis**

### **Funcionalidades Implementadas:**
- **Sistema de autenticação** com usuários demo
- **Dashboard interativo** com métricas e gráficos
- **RAG Explorer** com busca de documentos
- **Sistema de conversação** com contexto
- **Configurações avançadas** para RAG
- **Interface responsiva** e moderna
- **Temas e customização** visual

### **Em Desenvolvimento:**
- **Model Testing** (interface placeholder)
- **Risk Analysis** (ferramentas avançadas)
- **Reports** (geração de relatórios)
- **Integração real com API** (modo demo ativo)

## **Casos de Uso para Demonstração**

### **1. Analista de Risco**
```bash
# Cenário: Análise de portfolio
# 1. Login como analyst@creditdecision.com
# 2. Ir para Dashboard
# 3. Analisar métricas de risco
# 4. Usar RAG para consultar políticas
# 5. Gerar insights baseados em dados
```

### **2. Gerente de Crédito**
```bash
# Cenário: Revisão de decisões
# 1. Login como admin@creditdecision.com
# 2. Revisar dashboard executivo
# 3. Consultar RAG sobre regulamentações
# 4. Analisar tendências de aprovação
```

### **3. Compliance Officer**
```bash
# Cenário: Auditoria de políticas
# 1. Usar RAG Explorer
# 2. Buscar documentos de compliance
# 3. Verificar aderência às regulamentações
# 4. Gerar relatórios de conformidade
```

## **Comandos de Inicialização Rápida**

### **Teste Completo em 1 Comando:**
```bash
# Iniciar tudo e abrir no navegador
./scripts/start-streamlit.sh streamlit-only && open http://localhost:8501
```

### **Teste de Desenvolvimento:**
```bash
# Para desenvolvimento ativo
docker-compose up -d postgres redis api
cd streamlit_app && streamlit run app.py
```

### **Teste de Produção:**
```bash
# Simular ambiente de produção
docker-compose -f docker-compose.prod.yml up -d streamlit
```

## **Checklist de Teste**

### **Antes de Testar:**
- [ ] Docker instalado e rodando
- [ ] Portas 8501, 3001, 5432, 6379 disponíveis
- [ ] Arquivo .env configurado (opcional)
- [ ] Scripts com permissão de execução

### **Durante o Teste:**
- [ ] Login funciona com credenciais demo
- [ ] Dashboard carrega com dados simulados
- [ ] RAG Explorer responde a perguntas
- [ ] Navegação entre páginas funciona
- [ ] Interface responsiva em diferentes tamanhos
- [ ] Logs não mostram erros críticos

### **Após o Teste:**
- [ ] Parar serviços: `docker-compose down`
- [ ] Limpar volumes se necessário: `docker-compose down -v`
- [ ] Documentar bugs ou melhorias encontradas

---

**Dica:** Use o modo `streamlit-only` para testes rápidos e `full` para demonstrações completas da plataforma.
