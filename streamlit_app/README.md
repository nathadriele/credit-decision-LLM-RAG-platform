# 🏦 Streamlit Analytics - Credit Decision Platform

> **Ferramenta interna de analytics e exploração de dados para a plataforma de decisão de crédito**

## 🚀 Início Rápido

### **Opção 1: Docker (Recomendado)**
```bash
# Do diretório raiz do projeto
./scripts/start-streamlit.sh streamlit-only

# Ou no Windows
test-streamlit.bat

# Acesse: http://localhost:8501
```

### **Opção 2: Python Local**
```bash
cd streamlit_app
python -m venv venv
source venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
streamlit run app.py
```

## 🔐 **Credenciais Demo**

```
👤 Admin: admin@creditdecision.com / admin123
👤 Analyst: analyst@creditdecision.com / analyst123
```

## 📊 **Funcionalidades**

### **1. Dashboard Executivo**
- 📈 KPIs em tempo real
- 📊 Gráficos interativos
- 🎯 Métricas de performance
- 💰 Análise de portfolio

### **2. RAG Explorer**
- 🔍 Busca inteligente em documentos
- 💬 Conversação contextual
- 📄 Exploração de coleções
- ⚙️ Configurações avançadas

### **3. Ferramentas de Análise**
- 🤖 Teste de modelos de IA
- 🛡️ Análise de risco
- 📋 Geração de relatórios
- 📊 Analytics avançados

## 🏗️ **Arquitetura**

```
Streamlit App (Port 8501)
├── 🔐 Authentication Layer
├── 📊 Dashboard Module
├── 🔍 RAG Explorer Module
├── 🤖 AI Testing Module
└── 📋 Reports Module
     ↓
API Gateway (Port 3001)
├── 🔑 JWT Authentication
├── 📊 Data Services
├── 🤖 AI/RAG Services
└── 📈 Metrics Services
```

## 📁 **Estrutura do Projeto**

```
streamlit_app/
├── app.py                 # Aplicação principal
├── config.py             # Configurações
├── requirements.txt      # Dependências Python
├── .env                  # Variáveis de ambiente
├── utils/
│   ├── api_client.py     # Cliente da API
│   └── auth.py           # Autenticação
└── pages/
    ├── dashboard.py      # Dashboard principal
    ├── rag_explorer.py   # Explorador RAG
    ├── model_testing.py  # Teste de modelos
    └── reports.py        # Relatórios
```

## ⚙️ **Configuração**

### **Variáveis de Ambiente**
```bash
# API Configuration
API_BASE_URL=http://localhost:3001
API_TIMEOUT=30

# OpenAI (opcional para demo)
OPENAI_API_KEY=sk-proj-your-key

# Database (para acesso direto se necessário)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/credit_decision_db

# Redis
REDIS_URL=redis://localhost:6379

# ChromaDB
CHROMADB_URL=http://localhost:8000
```

### **Customização de Tema**
```bash
# Cores do tema
STREAMLIT_THEME_PRIMARY_COLOR=#1f77b4
STREAMLIT_THEME_BACKGROUND_COLOR=#ffffff
STREAMLIT_THEME_SECONDARY_BACKGROUND_COLOR=#f0f2f6
```

## 🧪 **Desenvolvimento**

### **Estrutura de Páginas**
```python
# Criar nova página
def show_my_page():
    st.title("🎯 Minha Página")
    
    # Verificar autenticação
    if not check_authentication():
        show_login_form()
        return
    
    # Verificar permissões
    if not has_permission("my_permission"):
        st.error("Sem permissão")
        return
    
    # Conteúdo da página
    st.write("Conteúdo aqui...")

# Adicionar ao menu principal em app.py
```

### **Integração com API**
```python
from utils.api_client import api_client

# Fazer chamada para API
response = api_client.get_applications(page=1, limit=20)

if response.get("success"):
    data = response["data"]
    st.dataframe(data["items"])
else:
    st.error(f"Erro: {response.get('error')}")
```

### **Componentes Reutilizáveis**
```python
# Métricas padronizadas
def show_metric_card(title, value, delta=None):
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.metric(title, value, delta)

# Gráficos padronizados
def show_line_chart(data, x, y, title):
    fig = px.line(data, x=x, y=y, title=title)
    st.plotly_chart(fig, use_container_width=True)
```

## 🔍 **Debugging**

### **Logs e Monitoramento**
```bash
# Ver logs do Streamlit
docker-compose logs -f streamlit

# Verificar health check
curl http://localhost:8501/_stcore/health

# Monitorar performance
docker stats streamlit
```

### **Modo Debug**
```python
# Adicionar em config.py
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"

# Usar no código
if config.DEBUG_MODE:
    st.write("Debug info:", debug_data)
```

## 📈 **Performance**

### **Otimizações**
- ✅ **Cache de dados** com `@st.cache_data`
- ✅ **Cache de recursos** com `@st.cache_resource`
- ✅ **Lazy loading** de componentes pesados
- ✅ **Paginação** para grandes datasets

### **Exemplo de Cache**
```python
@st.cache_data(ttl=300)  # Cache por 5 minutos
def load_dashboard_data():
    return api_client.get_dashboard_metrics()

@st.cache_resource
def init_ai_model():
    return load_model("gpt-4")
```

## 🚀 **Deploy**

### **Docker Production**
```bash
# Build imagem de produção
docker build -f Dockerfile.streamlit -t streamlit-analytics .

# Run em produção
docker run -d \
  --name streamlit-analytics \
  -p 8501:8501 \
  -e API_BASE_URL=https://api.creditdecision.com \
  streamlit-analytics
```

### **Kubernetes**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: streamlit-analytics
spec:
  replicas: 2
  selector:
    matchLabels:
      app: streamlit-analytics
  template:
    metadata:
      labels:
        app: streamlit-analytics
    spec:
      containers:
      - name: streamlit
        image: streamlit-analytics:latest
        ports:
        - containerPort: 8501
        env:
        - name: API_BASE_URL
          value: "http://api-service:3001"
```

## 🔒 **Segurança**

### **Autenticação**
- 🔐 **JWT tokens** para API
- 👤 **Session management** no Streamlit
- 🛡️ **Role-based access** control
- ⏰ **Token expiration** handling

### **Boas Práticas**
- ✅ **Não expor** credenciais no código
- ✅ **Validar** todas as entradas
- ✅ **Sanitizar** dados exibidos
- ✅ **Logs** de auditoria

## 📚 **Recursos Adicionais**

### **Documentação**
- [Streamlit Docs](https://docs.streamlit.io/)
- [Plotly Docs](https://plotly.com/python/)
- [Pandas Docs](https://pandas.pydata.org/docs/)

### **Componentes Úteis**
- `streamlit-option-menu` - Menus avançados
- `streamlit-aggrid` - Tabelas interativas
- `streamlit-authenticator` - Autenticação
- `plotly` - Gráficos interativos

## 🆘 **Suporte**

### **Problemas Comuns**
1. **Streamlit não carrega**: Verificar logs e portas
2. **Erro de API**: Verificar conectividade e tokens
3. **Performance lenta**: Implementar cache adequado
4. **Problemas de auth**: Verificar JWT e sessões

### **Contato**
- 📧 **Email**: dev-team@creditdecision.com
- 💬 **Slack**: #streamlit-support
- 📖 **Wiki**: https://wiki.creditdecision.com/streamlit

---

**🎯 Streamlit Analytics - Transformando dados em insights acionáveis!**
