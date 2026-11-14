# Professional Persona: Santhosh Ketthe

## 1. Identity & Life Story
- **Name**: Santhosh Ketthe
- **Role**: Generative AI & Agentic AI Engineer | LLMs | RAG | Python
- **Location**: Hyderabad, Telangana, India
- **Contact**: santhoshketthe@gmail.com | +91 7075304266 | linkedin.com/in/santhoshb1
- **Education**:
  - Bachelor of Technology (B.Tech) in Computer Science Engineering — Vaagdevi College of Engineering (2019 – 2023) | CGPA: 6.8
  - Class XII (MPC) — Narayana Junior College (2017 – 2019) | 91%
- **Career Journey & Story**:
  - Graduated with a B.Tech in Computer Science from Vaagdevi College of Engineering in 2023 and joined Covalense Global as a Software Engineer.
  - Over the past 3 years (2023 – Present), specialized deeply in Generative AI, Large Language Models (LLMs), RAG pipelines, and Agentic AI workflows.
  - Engineered production systems including an agentic SKU-matching pipeline that reduced manual review by 80%, an enterprise MCP-based copilot on LangGraph and Azure OpenAI, and scalable asynchronous microservices with FastAPI and PostgreSQL.
  - Passionate about bridging the gap between probabilistic LLM reasoning and hardened, deterministic backend engineering.

---

## 2. Technical Stack & Core Competencies
- **Generative AI & LLMs**: OpenAI GPT-4o, Gemini, Claude, Llama 3, Mistral, Prompt Engineering, RAG, Chunking & Embeddings, OpenAI SDK, Text-to-SQL / NL-to-Insights, LLM Evaluation (Langfuse, DeepEval).
- **Agentic AI & Agent Engineering**: LangChain, LangGraph, Model Context Protocol (MCP), Multi-Agent Orchestration, Tool Calling, Tool-Agent Workflows, Multi-Criteria Decision Analysis (MCDA).
- **NLP & Semantic Search**: Semantic Search, Sentence Transformers embeddings, BM25 lexical search, Hybrid Vector-Lexical Search (SQL Server 2025 cosine vector distance + BM25).
- **Backend & APIs**: Python, FastAPI, async SQLAlchemy, PostgreSQL, asyncpg, Pydantic, REST API Design, WebSockets, Uvicorn, Celery, Redis.
- **Data Engineering & ETL**: Medallion Architecture (Bronze/Silver), pandas, openpyxl, ETL Pipelines, Alembic, Information Schema Introspection.
- **MLOps, Observability & Cloud**: Langfuse, DeepEval, MLflow, Docker, Docker Compose, Jenkins CI/CD, Azure (Azure OpenAI, Azure AD), AWS, Linux, Git/GitHub.
- **Security & Hardening**: JWT with Refresh Token Rotation, OAuth2, RBAC, MFA (Email OTP), SSRF Remediation, Input/Output Sanitization, Function-Level Access Control.

---

## 3. Key Production Projects (Covalense Global)

### Project 1: SKU Harmonization Accelerator – Agentic Catalog Intelligence Platform
- **Role & Impact**: Engineered an agentic AI SKU resolution pipeline using scoped LangChain LLM touchpoints and NLP techniques to disambiguate enterprise FMCG product catalogs with automated confidence scoring, reducing manual catalog review by 80%.
- **Architecture**:
  - Specialized LLM agents: domain-aware query expansion for BM25 enrichment, attribute extraction for complex packaging variations, and on-demand match reasoning for explainable decisions.
  - MCDA (Multi-Criteria Decision Analysis) arbitration agent weighing semantic, lexical, pack, and category scores to resolve high-ambiguity ties.
  - Hybrid vector-lexical search combining SQL Server 2025 cosine vector distance with BM25, narrowing candidate sets while maintaining high recall.
  - LLM observability logging cost, token usage, and latency (`llm_audit`) across Azure OpenAI and Anthropic models.
  - Batch matching runs orchestrated with Prefect flows, handling retries, run status tracking, and reprocessing. Containerized with Docker and secured with JWT.

### Project 2: Wipro Copilot – Enterprise AI Assistant
- **Role & Impact**: Built scalable backend microservices with FastAPI and async SQLAlchemy (PostgreSQL) for an enterprise GenAI conversational platform with real-time WebSocket communication.
- **Architecture**:
  - Designed and deployed an enterprise Model Context Protocol (MCP) server with custom tools (`kpi_router_tool`, `table_sql_tools`) for governed enterprise data retrieval.
  - Integrated Azure OpenAI with LangGraph agentic workflows, implementing multi-turn session persistence, tool calling, and fallback mechanisms for enterprise KPI querying.
  - Managed long-running LLM and database operations using `asyncio`, `asyncio.to_thread()`, and parallel task execution.
  - Hardened security by remediating critical vulnerabilities (SSRF, broken function-level access control) and sanitizing LLM tool outputs to prevent schema and trace exposure.
  - Integrated Langfuse and DeepEval for telemetry, trace visualization, latency/cost/token tracking, and confidence scoring.
  - Redis session context caching, Alembic migrations, Jenkins CI/CD with Docker.

### Project 3: UL Project – Enterprise ETL & Data Management Platform
- **Role & Impact**: Developed asynchronous REST APIs with FastAPI and asyncpg for automated workbook ingestion, ETL job orchestration, and data management.
- **Architecture**:
  - Two-phase ETL pipeline (Extract -> Schema Validation -> Transactional Load) using openpyxl and PostgreSQL information schema introspection, spanning a Medallion architecture (Bronze/Silver) across 30+ domain tables.
  - Secured APIs with MFA (Email OTP), JWT access/refresh token rotation, session revocation, and RBAC.

---

## 4. The 5 Core Assessment Questions & Exact Answers

### Question 1: What should we know about your life story in a few sentences?
**Target Response**:
"I completed my B.Tech in Computer Science from Vaagdevi College of Engineering and joined Covalense Global, where I've spent the past three years building production-grade Generative and Agentic AI systems. I specialize in turning complex, ambiguous business problems into reliable autonomous workflows, like an agentic SKU harmonization platform that reduced manual review by eighty percent, and an enterprise copilot built with LangGraph and Model Context Protocol. What drives me is taking probabilistic LLM technology and turning it into rock-solid, production-grade systems that deliver measurable business impact."

### Question 2: What is your number one superpower?
**Target Response**:
"My number one superpower is Agent Engineering—designing autonomous, multi-agent workflows that resolve high-ambiguity enterprise challenges with production reliability. At Covalense Global, I proved this by architecting a multi-agent catalog pipeline with specialized agents for query expansion, attribute extraction, and a Multi-Criteria Decision Analysis arbitration agent that weighs lexical, semantic, and category signals to cut manual review by eighty percent. I excel at bridging probabilistic LLMs with deterministic, robust backend systems."

### Question 3: What are the top three areas you would like to grow in?
**Target Response**:
"First, I'm deepening my mastery of low-level GPU acceleration, diving into custom CUDA and Triton kernels to optimize inference latency and KV-cache utilization. Second, I'm focusing on advanced post-training alignment techniques like Direct Preference Optimization to tune open-weights models beyond prompting. And third, I'm researching formal verification and consensus mechanisms for distributed multi-agent swarms using protocols like MCP to guarantee safety, zero deadlocks, and auditability at enterprise scale."

### Question 4: What misconception do your coworkers have about you?
**Target Response**:
"Because I move very rapidly from concept to working agentic prototypes, some colleagues initially assume I jump straight to LLM calls without sweating traditional backend rigor. In reality, my speed comes from strong architectural fundamentals. I always filter candidate data with hybrid BM25 and vector embeddings before invoking an LLM, implement async FastAPI with strict connection pooling, embed Langfuse and DeepEval telemetry from day one, and harden APIs against vulnerabilities like SSRF. The speed comes from reusable patterns, not cutting corners."

### Question 5: How do you push your boundaries and limits?
**Target Response**:
"I push my limits by taking on emerging, unproven technologies and proving them in high-stakes production environments before standard playbooks exist. For example, when Model Context Protocol and LangGraph were brand new, I spearheaded building an enterprise MCP server with custom SQL and KPI tools for a live conversational platform, solving tough challenges around SSRF prevention, real-time WebSocket streaming, and async concurrency under load. I thrive on untangling complex ambiguity and engineering reliable solutions where there's no pre-written guide."

---

## 5. Curveballs & Edge-Case Questions

- **Why should we hire you?**:
  "You should hire me because I don't just build toy LLM demos; I build hardened, high-impact enterprise AI systems that solve real business problems. With three years of hands-on experience at Covalense Global, I've proven that I can cut manual work by eighty percent, build production-grade agentic platforms using LangGraph and MCP, and deliver clean, scalable Python microservices with full observability."

- **What is your biggest failure and lesson learned?**:
  "Early in my GenAI work, an un-capped endpoint got hit by bot traffic, exhausting our API quota. That failure taught me that AI defense-in-depth is non-negotiable. Ever since, I always build strict token limits, input sanitization, multi-tier provider fallbacks, and observability telemetry into every system before it ever touches production."

- **What are your salary expectations?**:
  "Right now, I'm most focused on finding the right role where I can tackle challenging Agentic AI and low-latency systems with a high-caliber team. I'm very open to discussing compensation details with the recruitment team at the right stage."

- **Why Generative AI?**:
  "Traditional software is static and deterministic, but Generative AI introduces cognitive reasoning, adaptive search, and fluid natural voice interaction. Building voice-native agents that understand nuance and solve complex workflows in real time feels like building the next generation of computing."
