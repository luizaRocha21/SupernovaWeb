# Manejo Caatingueiro — API (back end)

Back end da ferramenta consultiva para agricultores do semiárido baiano. O núcleo é o **painel de chuva hiperlocal**
(chuva acumulada vs. normal da localidade) e a **sugestão consultiva de plantio** (milho, mamona, feijão).
O sistema orienta, nunca determina (RN12).

> **Status:** código escrito conforme o prompt, mas **ainda não compilado nem testado com Maven** (o ambiente de
> geração não alcançava o Maven Central). Passos 1 e 2 abaixo são o primeiro a fazer. Os testes foram escritos
> para cada RN, mas nunca foram executados.

## Stack

Java 21 · Maven · Spring Boot 3.2.5 · Spring Web · Spring Data JPA · Lombok · Validation · Spring Security (JWT) ·
MySQL (H2 só em testes) · springdoc (Swagger).

Dependências além das listadas no prompt (justificadas):
- `jjwt` 0.12.5: o prompt exige JWT e o Spring Security não traz biblioteca para isso.
- `springdoc-openapi-starter-webmvc-ui` 2.3.0: o prompt exige OpenAPI/Swagger.

## Como rodar

```bash
mvn clean verify                 # 1) compila e roda os testes
export DB_URL="jdbc:mysql://localhost:3306/manejo_caatingueiro?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true"
export DB_USER=...               # nunca fixar no código
export DB_PASSWORD=...
export JWT_SECRET="...pelo menos 32 caracteres..."
export BOOTSTRAP_GESTOR_TELEFONE=74999990000   # opcional: cria o 1º gestor se não houver nenhum
export BOOTSTRAP_GESTOR_SENHA=...
mvn spring-boot:run -Dspring-boot.run.profiles=dev   # perfil dev carrega dados FICTÍCIOS (veja abaixo)
```

Swagger: `http://localhost:8080/swagger-ui.html`

| Variável | Obrigatória | Padrão | Uso |
|---|---|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | sim | — | MySQL |
| `JWT_SECRET` | sim | — | assinatura do JWT (mín. 32 caracteres) |
| `JWT_EXPIRACAO_MIN` | não | 480 | validade do token |
| `JPA_DDL_AUTO` | não | `update` | em produção, prefira `validate` + migração |
| `CLIMA_FONTE` | não | `stub` | fonte de dados climáticos (RF18) |
| `CLIMA_INGESTAO_AGENDADA` | não | `false` | liga o job de ingestão (só com fonte real) |
| `BOOTSTRAP_GESTOR_TELEFONE/SENHA/NOME`, `BOOTSTRAP_LOCALIDADE` | não | — | primeiro gestor |

## Camadas e pacotes

`Controller → Service → Repository → Banco`, com Entity trafegando entre as camadas.
Pacotes `br.com.ifba.[funcionalidade].[camada]`; services com interface `XxxIService` + implementação `XxxService`;
repositórios estendem `JpaRepository` (sem DAO). `br.com.ifba.infrastructure` guarda `PersistenceEntity`,
exceções, handler global, segurança e configuração.

Funcionalidades: `usuario`, `auth`, `localidade`, `cultura`, `precipitacao`, `clima` (RF18), `painel` (RF04/RF06),
`reservatorio` (RF07/RF08), `sync` (RF17), `alerta`, `mural` e `checklist` (atrás de feature flag).

## Endpoints (`/api/v1`)

| RF | Endpoint | Quem |
|---|---|---|
| RF01 | `POST /usuarios` | público para AGRICULTOR; outros perfis exigem token de GESTOR_PUBLICO |
| RF02 | `POST /auth/login` | público |
| — | `GET /usuarios/me`, `POST/GET /localidades`, `GET /localidades/{id}` | autenticado (POST: gestor) |
| RF05 | `GET/POST/PUT /culturas`, `PUT /culturas/{id}/limiar-usuario` | autenticado (POST/PUT: gestor; limiar: qualquer um) |
| RF03 | `POST /precipitacoes`, `GET /precipitacoes` | autenticado (lista só os próprios registros) |
| RF04 | `GET /localidades/{id}/painel-chuva?cultura=` | autenticado |
| RF06 | `GET /localidades/{id}/sugestao-plantio?cultura=` | autenticado (registra a sugestão emitida) |
| RF07 | `POST /reservatorios`, `GET /reservatorios`, `POST /reservatorios/{id}/niveis` | autenticado |
| RF08 | `GET /localidades/{id}/monitor-reservatorios` | autenticado, da própria localidade |
| RF12/13 | `POST /alertas` (liderança/gestor), `GET /alertas?localidadeId=` | autenticado |
| RF17 | `POST /sync/registros` (lote idempotente, até 200 itens) | autenticado |
| RF18 | `POST /admin/ingestao/localidades/{id}`, `POST /admin/ingestao/todas` | GESTOR_PUBLICO |
| RF14/15 | `POST/GET /avisos` | só com `app.features.mural=true` |
| RF16 | `POST /reservatorios/{id}/checklists`, `GET .../ultimo` | só com `app.features.checklist=true` |

## Regras de negócio → onde estão

| RN | Onde | Teste |
|---|---|---|
| RN01 | `ReservatorioService.saveNivel` | `ReservatorioServiceTest` |
| RN02 | `ReservatorioService.saveNivel` + constraint única | `ReservatorioServiceTest`, `RegistroNivelRepositoryTest` |
| RN04 | `PainelChuvaService.historicoSuficiente`, `SugestaoPlantioService.gerar` | `PainelChuvaServiceTest`, `SugestaoPlantioServiceTest` |
| RN07 | `AlertaService.findVigentesByLocalidade` + `LocalidadeService.podeAcessar` | `AlertaServiceTest` |
| RN09 | `CulturaService` + `SugestaoPlantioService` | `SugestaoPlantioServiceTest` |
| RN10 | `RegistroNivelRepository.findUltimosAgregaveis` | `RegistroNivelRepositoryTest` |
| RN12 | `SugestaoPlantioService` (mensagens e resultados não binários; nenhum endpoint bloqueia) | `SugestaoPlantioServiceTest` |
| RN13 | `ETag` (`EtagConfig`), `Cache-Control` nos controllers, `SyncService`/`idClienteSync` | `PainelControllerTest`, `SyncServiceTest` |
| RN15 | `MonitorService`, `ReservatorioRepository.contarResponsaveisAgregaveis` | `MonitorServiceTest` |
| RN16 | `PainelDto`/`SugestaoDto` sempre com `fonte` e data | `PainelChuvaServiceTest`, `PainelControllerTest` |

## Suposições registradas (decisões não especificadas no prompt)

Todas são configuráveis ou fáceis de trocar, e **precisam de validação**:

1. **Limiares agronômicos**: o perfil `dev` cria milho/mamona/feijão com limiares **placeholder**, rotulados como tal
   na `fonteLimiar`. Não têm base agronômica. Validar com técnico agrícola ou extensionista antes de qualquer uso real.
2. **Faixas da sugestão** (`app.sugestao.faixa-atencao=0.6`): razão chuva/limiar ≥ 1 → favorável; entre 0,6 e 1 →
   atenção; abaixo de 0,6 → considere alternativa. Não é critério agronômico validado.
3. **Suficiência da série** (RN04): `app.clima.anos-minimos-serie=10`, sobre a normal do mês da própria localidade ou, na
   falta, do município.
4. **Grau de confiança**: `0,6 × min(1, anosBase/30) + (dado externo ? 0,4 : 0,2)`. Heurística simples.
5. **Estação chuvosa** começa em novembro (`app.clima.inicio-estacao-chuvosa-mes=11`), a validar para Irecê.
6. **Dado manual × externo**: o dado externo é a base; registros manuais só entram quando não há dado externo no período.
7. **Escala do reservatório**: ≥75% cheio, ≥40% médio, ≥15% baixo, abaixo disso crítico.
8. **RN15**: mínimo de 5 responsáveis distintos (`app.monitor.minimo-participantes`), com consentimento
   (`consentimentoLocalizacao` cobre localização e uso agregado dos dados). O agregado de um município inclui os povoados.
9. **Visibilidade** (RN07/RN15): o usuário acessa a própria localidade e o município dela.
10. **Perfis**: o cadastro público só cria AGRICULTOR; liderança e gestor são criados por um gestor. O primeiro gestor
    vem do `BOOTSTRAP_*`. `/admin/**` é restrito a GESTOR_PUBLICO (não há perfil ADMIN no prompt).
11. **RN10**: o servidor só recebe registros já sincronizados; a flag `pendenteSincronizacao` existe e é respeitada
    nas consultas, mas a fila de pendências propriamente dita vive no app.
12. **Login por telefone** (identificador único). Sem recuperação de senha.

## Fonte de dados climáticos (RF18) — o que falta

A interface `FonteDadosClimaticosService` é o ponto de troca; o sistema não conhece INMET, Cemaden ou CHIRPS.
O padrão é `StubFonteDadosClimaticosService`, que gera dados **sintéticos** (nada ali representa chuva real).
Para ligar uma fonte real:

1. Concluir o **spike técnico**: avaliar série histórica e chuva recente para os povoados-alvo.
2. Criar uma classe `@Component @ConditionalOnProperty(name="app.clima.fonte", havingValue="<nome>")` que implemente
   `nomeFonte()`, `serieHistorica(...)` e `chuvaRecente(...)`, mapeando município/povoado para estação ou grade.
3. Definir `CLIMA_FONTE=<nome>` e, depois de validar, `CLIMA_INGESTAO_AGENDADA=true`.
4. Revisar `app.clima.anos-minimos-serie` com o que a fonte realmente oferece.

## Pendências e riscos conhecidos

- **Compilação e testes**: nunca executados; esperar pequenos ajustes no primeiro `mvn clean verify`.
- **Gate de validação**: mural, checklist, alertas e monitor não foram validados em campo. Mural e checklist ficam
  desligados por padrão (`app.features.*`); suas tabelas existem mesmo com a flag desligada.
- **RN11** (checklist não conforme sinalizado no monitor) não está integrada ao monitor, para manter o módulo isolado.
- **Alertas derivados do painel** (chuva abaixo do esperado, início das chuvas) não são gerados automaticamente: hoje
  a emissão é manual (RF12).
- **Login sem limite de tentativas**: falta proteção contra força bruta.
- **Migração de banco**: `ddl-auto=update` serve para desenvolvimento; em produção usar Flyway/Liquibase.
- **LGPD**: nunca versionar a planilha da pesquisa (traz nome, telefone e e-mail reais; `.gitignore` já bloqueia `*.xlsx`).
  O código não registra telefone, senha nem token em log.
- **Offline-first completo no servidor**: fora do escopo; há cache (`Cache-Control` + ETag) e fila de escrita idempotente.
- **Fora do escopo (Pós-MVP)**: solicitação de apoio hídrico/carro-pipa (RF09–RF11, RN03, RN05, RN06, RN14).
