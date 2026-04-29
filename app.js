const { useState, useEffect, useMemo, useCallback } = React;
const {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  ReferenceDot,
  Label,
} = Recharts;

function tentarCorrigirMojibake(texto) {
  if (typeof texto !== "string") return "";
  try {
    return decodeURIComponent(escape(texto));
  } catch (error) {
    return texto;
  }
}

function corrigirTextoProfundo(valor) {
  if (typeof valor === "string") return tentarCorrigirMojibake(valor);
  if (Array.isArray(valor)) return valor.map(corrigirTextoProfundo);
  if (!valor || typeof valor !== "object") return valor;

  return Object.fromEntries(Object.entries(valor).map(([chave, item]) => [chave, corrigirTextoProfundo(item)]));
}

function normalizarCategoria(cat) {
  return String(cat || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const PRES_ANOS = window.__MANDATOS__ || [];

function getCategoriaCor(cat) {
  const raw = window.__CATEGORIAS__ || {};
  const search = normalizarCategoria(cat);

  for (const chave in raw) {
    if (normalizarCategoria(chave) === search) return raw[chave];
  }

  const fixedSearch = normalizarCategoria(tentarCorrigirMojibake(cat));
  for (const chave in raw) {
    if (normalizarCategoria(chave) === fixedSearch) return raw[chave];
  }

  return "#79c0ff";
}

function hexToRgba(hex, alpha) {
  if (typeof hex !== "string") return `rgba(121, 192, 255, ${alpha})`;
  const clean = hex.replace("#", "").trim();
  const normalized =
    clean.length === 3
      ? clean
        .split("")
        .map((char) => char + char)
        .join("")
      : clean;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(121, 192, 255, ${alpha})`;
  }

  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const fixedFields = [
  ["fonte", "Fonte"],
  ["como_interpretar", "Como interpretar"],
  ["comparacao_paises", "Comparação entre países"],
];

const extraFields = [
  ["nivel_confiabilidade", "Nível de confiabilidade"],
  ["metodologia", "Metodologia"],
  ["historico_metodologia", "Histórico da metodologia"],
  ["abrangencia", "Abrangência"],
  ["periodicidade", "Periodicidade"],
  ["eventos_externos", "Eventos externos"],
  ["validacao", "Validação"],
  ["fontes_links", "Fontes e links"],
];

function LegendMandatos() {
  return (
    <div className="legend-mandatos-mobile">
      {PRES_ANOS.map((presidente) => (
        <div key={presidente.nome} className="legend-mandatos-item">
          <span
            className="legend-mandatos-swatch"
            style={{ backgroundColor: presidente.cor, border: `1px solid ${presidente.cor}` }}
          />
          <span>{presidente.nome}</span>
        </div>
      ))}
    </div>
  );
}

function formatarValorIndicador(valor) {
  if (valor == null || Number.isNaN(valor)) return "Sem valor";
  const abs = Math.abs(valor);
  const casas = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;

  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: casas }).format(valor);
}

function formatarPeriodo(anoIni, anoFim) {
  return anoIni === anoFim ? String(anoIni) : `${anoIni} - ${anoFim}`;
}

function formatarTickEixoY(valor) {
  if (Math.abs(valor) >= 1000) return `${(valor / 1000).toFixed(0)}k`;
  return formatarValorIndicador(valor);
}

function arredondarTick(valor) {
  if (!Number.isFinite(valor)) return 0;
  const abs = Math.abs(valor);
  if (abs >= 1000) return Math.round(valor / 100) * 100;
  if (abs >= 100) return Math.round(valor / 10) * 10;
  if (abs >= 10) return Math.round(valor);
  if (abs >= 1) return Math.round(valor * 10) / 10;
  return Math.round(valor * 100) / 100;
}

function criarDominioEixoY(valores) {
  if (!valores.length) return [0, 1];

  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const intervalo = Math.max(maximo - minimo, Math.abs(maximo), Math.abs(minimo), 1);
  const topo = maximo > 0 ? maximo + Math.abs(maximo) * 0.1 : 0 + intervalo * 0.1;
  const base = minimo < 0 ? minimo - Math.abs(minimo) * 0.1 : 0;

  return [base, topo];
}

function criarTicksEixoY(dominio) {
  const [minimo, maximo] = dominio;
  const total = 5;
  if (!Number.isFinite(minimo) || !Number.isFinite(maximo) || minimo === maximo) return [minimo, 0, maximo];

  const passo = (maximo - minimo) / (total - 1);
  const ticks = Array.from({ length: total }, (_, index) => {
    if (index === 0) return minimo;
    if (index === total - 1) return maximo;
    return arredondarTick(minimo + passo * index);
  });
  if (minimo < 0 && maximo > 0) ticks.push(0);

  return [...new Set(ticks)].sort((a, b) => a - b);
}

function criarTicksEixoX(anoIni, anoFim) {
  const ticks = [anoIni, anoFim];

  PRES_ANOS.forEach((presidente) => {
    if (presidente.ini >= anoIni && presidente.ini <= anoFim) ticks.push(presidente.ini);
  });

  return [...new Set(ticks)].sort((a, b) => a - b);
}

function abreviarEvento(nome) {
  if (!nome) return "";
  return nome.length > 24 ? `${nome.slice(0, 22)}...` : nome;
}

const ANO_MINIMO = 1995;
const ANO_MAXIMO = 2027;
const VISAO_COMPACTA = "compacta";
const VISAO_DETALHADA = "detalhada";
const PARAM_VISAO = "visao";
const PARAM_INDICADORES = "indicadores";
const PARAM_ANO_INICIO = "inicio";
const PARAM_ANO_FIM = "fim";

function lerAnoCompartilhado(params, nome) {
  if (!params.has(nome)) return null;
  const valor = Number(params.get(nome));
  if (!Number.isInteger(valor)) return null;
  return Math.min(ANO_MAXIMO, Math.max(ANO_MINIMO, valor));
}

function lerEstadoCompartilhado(keysValidas) {
  if (typeof window === "undefined") return { compacta: null, indicadores: null, periodo: null };

  const params = new URLSearchParams(window.location.search);
  const visao = String(params.get(PARAM_VISAO) || "").toLowerCase();
  const compacta = visao === VISAO_COMPACTA ? true : visao === VISAO_DETALHADA ? false : null;
  const anoInicioParam = lerAnoCompartilhado(params, PARAM_ANO_INICIO);
  const anoFimParam = lerAnoCompartilhado(params, PARAM_ANO_FIM);
  let indicadores = null;
  let periodo = null;

  if (params.has(PARAM_INDICADORES)) {
    const validas = new Set(keysValidas);
    indicadores = params
      .get(PARAM_INDICADORES)
      .split(",")
      .map((key) => key.trim())
      .filter((key, index, todas) => validas.has(key) && todas.indexOf(key) === index);
  }

  if (anoInicioParam !== null || anoFimParam !== null) {
    const anoInicio = anoInicioParam ?? ANO_MINIMO;
    const anoFim = anoFimParam ?? ANO_MAXIMO;
    periodo = anoInicio <= anoFim ? { anoIni: anoInicio, anoFim } : { anoIni: anoFim, anoFim: anoInicio };
  }

  return { compacta, indicadores, periodo };
}

function criarUrlCompartilhada(viewCompacta, selecionados, anoIni, anoFim) {
  const url = new URL(window.location.href);
  url.searchParams.set(PARAM_VISAO, viewCompacta ? VISAO_COMPACTA : VISAO_DETALHADA);
  url.searchParams.set(PARAM_INDICADORES, selecionados.join(","));
  url.searchParams.set(PARAM_ANO_INICIO, anoIni);
  url.searchParams.set(PARAM_ANO_FIM, anoFim);
  return url.toString();
}

function AppAnual() {
  const [meta, setMeta] = useState(null);
  const [dados, setDados] = useState({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [selecionados, setSelecionados] = useState([]);
  const [anoIni, setAnoIni] = useState(ANO_MINIMO);
  const [anoFim, setAnoFim] = useState(ANO_MAXIMO);
  const [menuAberto, setMenuAberto] = useState(false);
  const [catsAbertas, setCatsAbertas] = useState([]);
  const [viewCompacta, setViewCompacta] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [indicadorEmFoco, setIndicadorEmFoco] = useState(null);
  const [indicadoresSaindo, setIndicadoresSaindo] = useState([]);
  const refsIndicadores = React.useRef({});
  const timeoutsAnimacao = React.useRef({});

  const toggleCat = useCallback((cat) => {
    setCatsAbertas((prev) => (prev.includes(cat) ? prev.filter((item) => item !== cat) : [...prev, cat]));
  }, []);

  useEffect(() => {
    const carregar = () => {
      const json = window.__DADOS_ANUAIS__;
      if (!json) {
        setTimeout(carregar, 100);
        return;
      }

      try {
        const jsonCorrigido = corrigirTextoProfundo(json);
        setMeta(jsonCorrigido);
        setDados(jsonCorrigido);

        const keys = Object.keys(jsonCorrigido);
        if (keys.length > 0) {
          const estadoCompartilhado = lerEstadoCompartilhado(keys);
          const defaults = keys.filter((key) => jsonCorrigido[key].padrao === true);
          const fallback = keys.filter((key) => jsonCorrigido[key].validacao).slice(0, 3);
          const iniciais =
            estadoCompartilhado.indicadores !== null
              ? estadoCompartilhado.indicadores
              : defaults.length > 0
                ? defaults
                : fallback;

          if (estadoCompartilhado.compacta !== null) {
            setViewCompacta(estadoCompartilhado.compacta);
          }

          if (estadoCompartilhado.periodo !== null) {
            setAnoIni(estadoCompartilhado.periodo.anoIni);
            setAnoFim(estadoCompartilhado.periodo.anoFim);
          }

          setSelecionados(iniciais);

          const categoriasAbertas = [...new Set(iniciais.map((key) => jsonCorrigido[key].cat))];
          setCatsAbertas(categoriasAbertas.length ? categoriasAbertas : [jsonCorrigido[keys[0]].cat]);
        }

        setLoading(false);
      } catch (error) {
        setErro(error.message);
        setLoading(false);
      }
    };

    carregar();
  }, []);

  useEffect(() => {
    if (loading) return;

    const selecionadosAtivos = selecionados.filter((key) => !indicadoresSaindo.includes(key));
    const proximaUrl = criarUrlCompartilhada(viewCompacta, selecionadosAtivos, anoIni, anoFim);
    if (proximaUrl !== window.location.href) {
      window.history.replaceState(null, "", proximaUrl);
    }
  }, [anoFim, anoIni, indicadoresSaindo, loading, selecionados, viewCompacta]);

  useEffect(() => {
    if (!indicadorEmFoco || !selecionados.includes(indicadorEmFoco)) return;

    const alvo = refsIndicadores.current[indicadorEmFoco];
    if (alvo) {
      setTimeout(() => {
        alvo.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }

    const timeout = setTimeout(() => setIndicadorEmFoco(null), 900);
    return () => clearTimeout(timeout);
  }, [indicadorEmFoco, selecionados]);

  useEffect(() => {
    return () => {
      Object.values(timeoutsAnimacao.current).forEach(clearTimeout);
    };
  }, []);

  const cats = useMemo(() => {
    if (!meta) return {};
    const agrupadas = {};

    for (const [key, value] of Object.entries(meta)) {
      if (!agrupadas[value.cat]) agrupadas[value.cat] = [];
      agrupadas[value.cat].push(key);
    }

    return agrupadas;
  }, [meta]);

  const removerIndicador = useCallback((key) => {
    setIndicadoresSaindo((prev) => (prev.includes(key) ? prev : [...prev, key]));
    clearTimeout(timeoutsAnimacao.current[key]);
    timeoutsAnimacao.current[key] = setTimeout(() => {
      setSelecionados((prev) => prev.filter((item) => item !== key));
      setIndicadoresSaindo((prev) => prev.filter((item) => item !== key));
      delete timeoutsAnimacao.current[key];
      delete refsIndicadores.current[key];
    }, 280);
  }, []);

  const toggle = useCallback(
    (key) => {
      if (selecionados.includes(key)) {
        removerIndicador(key);
        return;
      }

      clearTimeout(timeoutsAnimacao.current[key]);
      setIndicadoresSaindo((saindo) => saindo.filter((item) => item !== key));
      setIndicadorEmFoco(key);
      setSelecionados((prev) => (prev.includes(key) ? prev : [...prev, key]));
    },
    [removerIndicador, selecionados],
  );

  const limparSelecao = useCallback(() => {
    selecionados.forEach(removerIndicador);
  }, [removerIndicador, selecionados]);

  const selecionadosAtivos = useMemo(() => {
    return selecionados.filter((key) => !indicadoresSaindo.includes(key));
  }, [indicadoresSaindo, selecionados]);

  const registrarRefIndicador = useCallback((key, node) => {
    if (node) {
      refsIndicadores.current[key] = node;
    } else {
      delete refsIndicadores.current[key];
    }
  }, []);

  const compartilharVisaoAtual = useCallback(() => {
    const url = criarUrlCompartilhada(viewCompacta, selecionadosAtivos, anoIni, anoFim);

    const concluir = () => {
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2500);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(concluir)
        .catch(() => copiarFallback(url, concluir));
    } else {
      copiarFallback(url, concluir);
    }
  }, [anoFim, anoIni, selecionadosAtivos, viewCompacta]);

  const anosDisponiveis = useMemo(() => {
    const anos = [];
    for (let ano = ANO_MINIMO; ano <= ANO_MAXIMO; ano += 1) {
      anos.push(ano);
    }
    return anos;
  }, []);

  const aoMudarAnoInicial = useCallback(
    (valor) => {
      const proximoInicio = Math.min(Number(valor), anoFim);
      setAnoIni(proximoInicio);
    },
    [anoFim],
  );

  const aoMudarAnoFinal = useCallback(
    (valor) => {
      const proximoFim = Math.max(Number(valor), anoIni);
      setAnoFim(proximoFim);
    },
    [anoIni],
  );

  if (loading) {
    return (
      <div className="empty-state" style={{ margin: 24 }}>
        <div className="empty-state__eyebrow">Carregando</div>
        <h3 className="empty-state__title">Preparando o atlas visual.</h3>
        <p className="empty-state__text">Os indicadores anuais estão sendo organizados para leitura.</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="empty-state" style={{ margin: 24 }}>
        <div className="empty-state__eyebrow">Falha de carga</div>
        <h3 className="empty-state__title">Não foi possível montar o painel.</h3>
        <p className="empty-state__text">Erro: {erro}</p>
      </div>
    );
  }

  const totalValidadas = meta ? Object.values(meta).filter((value) => value.validacao).length : 0;
  const totalCategorias = Object.keys(cats).length;
  const periodoSelecionado = formatarPeriodo(anoIni, anoFim);
  const totalMandatos = PRES_ANOS.filter(
    (presidente) => Math.min(anoFim + 1, presidente.fim) > Math.max(anoIni, presidente.ini),
  ).length;

  return (
    <div className={"app-layout" + (viewCompacta ? " app-layout--compact" : "")}>
      <div className="app-body">
        <div className={"sidebar sidebar-anual" + (menuAberto ? " aberto" : "")}>
          <div className="sidebar-anual__top">
            <div className="sidebar-title-block">
              <h1>Indicadores anuais do Brasil</h1>
              <div className="subtitle">
                Explore séries históricas, compare períodos e conecte dados econômicos, sociais e institucionais ao
                contexto presidencial.
              </div>
            </div>

            <div className="sidebar-panel sidebar-date-range">
              <div className="sidebar-section-header">
                <span className="sidebar-section-title">Janela temporal</span>
              </div>

              <div className="sidebar-date-values">
                <label className="sidebar-date-field">
                  <select
                    value={anoIni}
                    onChange={(event) => aoMudarAnoInicial(event.target.value)}
                    aria-label="Ano inicial"
                  >
                    {anosDisponiveis
                      .filter((ano) => ano <= anoFim)
                      .map((ano) => (
                        <option key={`inicio-${ano}`} value={ano}>
                          {ano}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="sidebar-date-field">
                  <select
                    value={anoFim}
                    onChange={(event) => aoMudarAnoFinal(event.target.value)}
                    aria-label="Ano final"
                  >
                    {anosDisponiveis
                      .filter((ano) => ano >= anoIni)
                      .map((ano) => (
                        <option key={`fim-${ano}`} value={ano}>
                          {ano}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="sidebar-panel sidebar-visualization">
              <div className="sidebar-section-header">
                <span className="sidebar-section-title">Visualização</span>
              </div>

              <div className="view-toggle">
                <button
                  className={"view-toggle-btn" + (!viewCompacta ? " ativo" : "")}
                  onClick={() => setViewCompacta(false)}
                >
                  Detalhada
                </button>
                <button
                  className={"view-toggle-btn" + (viewCompacta ? " ativo" : "")}
                  onClick={() => setViewCompacta(true)}
                >
                  Compacta
                </button>
              </div>

              <div className="sidebar-action-row">
                <button
                  type="button"
                  className={"share-view-btn" + (linkCopiado ? " copiado" : "")}
                  onClick={compartilharVisaoAtual}
                  title="Copiar link da visao atual"
                  aria-describedby={linkCopiado ? "share-copy-message" : undefined}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  <span>{linkCopiado ? "Link copiado" : "Compartilhar"}</span>
                </button>
                <button
                  type="button"
                  className="action-btn clear-selection-btn"
                  onClick={limparSelecao}
                  disabled={selecionadosAtivos.length === 0}
                >
                  Limpar
                </button>
              </div>
              {linkCopiado && (
                <div id="share-copy-message" className="share-copy-message" role="status" aria-live="polite">
                  Link copiado para a área de transferência.
                </div>
              )}
            </div>
          </div>

          <div className="sidebar-anual__scroll">
            {Object.entries(cats).map(([cat, keys]) => {
              const validados = keys.filter((key) => meta[key].validacao);
              if (validados.length === 0) return null;

              const aberta = catsAbertas.includes(cat);
              return (
                <div key={cat} className="sidebar-category">
                  <div
                    className={"cat-label" + (aberta ? " aberta" : "")}
                    onClick={() => toggleCat(cat)}
                    style={{ cursor: "pointer" }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transition: "transform 0.2s",
                        transform: aberta ? "rotate(90deg)" : "none",
                        marginRight: "10px",
                      }}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>

                    <span className="cat-label-text">{cat}</span>
                    <span className="cat-label-count">
                      <span style={{ color: getCategoriaCor(cat) }}>{validados.length}</span>
                    </span>
                  </div>

                  <div className={"ind-grid-wrapper" + (aberta ? " aberta" : "")}>
                    <div className="ind-grid-inner">
                      <div className="ind-grid">
                        {validados.map((key) => {
                          const ativa = selecionadosAtivos.includes(key);
                          return (
                            <button
                              key={key}
                              type="button"
                              className={"ind-btn" + (ativa ? " ativo" : "")}
                              style={ativa ? { boxShadow: `inset 3px 0 0 ${getCategoriaCor(cat)}` } : undefined}
                              onClick={(event) => {
                                event.preventDefault();
                                toggle(key);
                              }}
                            >
                              <span className="ind-dot" style={{ backgroundColor: getCategoriaCor(cat) }} />
                              <span className="ind-content">
                                <span className="ind-label">{meta[key].label}</span>
                                {meta[key].fonte_sigla && (
                                  <span className="ind-source-badge">{meta[key].fonte_sigla}</span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="main-content main-content-anual">
          <div className="dashboard-shell">
            <LegendMandatos />

            <div className="cards-wrapper">
              {selecionados.length > 0 &&
                selecionados.map((key) => {
                  const dadosMetrica = dados[key]?.dados || [];
                  const dadosFiltrados = dadosMetrica.filter((item) => item.ano >= anoIni && item.ano <= anoFim);

                  if (!meta || !meta[key]) return null;

                  return (
                    <div
                      key={key}
                      ref={(node) => registrarRefIndicador(key, node)}
                      className={
                        "chart-card-shell" +
                        (indicadorEmFoco === key ? " chart-card-shell--entrada" : "") +
                        (indicadoresSaindo.includes(key) ? " chart-card-shell--saida" : "")
                      }
                    >
                      <GraficoAnual
                        dados={dadosFiltrados}
                        info={meta[key]}
                        cor={getCategoriaCor(meta[key].cat)}
                        anoIni={anoIni}
                        anoFim={anoFim}
                        onFechar={() => removerIndicador(key)}
                        compacta={viewCompacta}
                      />
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <button className="menu-btn-anual" onClick={() => setMenuAberto(!menuAberto)} title="Menu de indicadores">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {menuAberto ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
          </svg>
        </button>

        <div className={"overlay-anual" + (menuAberto ? " visivel" : "")} onClick={() => setMenuAberto(false)} />
      </div>
    </div>
  );
}

function GraficoAnual({ dados, info, cor, anoIni, anoFim, onFechar, compacta }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const comDados = dados.filter((item) => item.valor != null);
  const ultimoDado = comDados.length ? comDados[comDados.length - 1] : null;
  const [expandido, setExpandido] = React.useState(false);
  const [eventoAtivo, setEventoAtivo] = React.useState(null);
  const [exibirAviso, setExibirAviso] = React.useState(false);

  const valoresVisiveis = comDados.map((item) => item.valor);
  const dominioY = criarDominioEixoY(valoresVisiveis);
  const ticksY = criarTicksEixoY(dominioY);
  const ticksX = criarTicksEixoX(anoIni, anoFim);
  const alturaGrafico = isMobile ? (compacta ? 150 : 220) : compacta ? 150 : 220;
  const margemGrafico = {
    top: isMobile ? 0 : 5,
    right: isMobile ? 25 : 15,
    bottom: isMobile ? 15 : 0,
    left: isMobile ? -8 : -2,
  };

  const copiarParaIA = () => {
    const prompt = `Instruções para a IA: valide a confiabilidade dos dados do indicador abaixo. Verifique se os valores numéricos batem com a fonte oficial citada (${info.fonte}), se a descrição e os eventos históricos condizem com a realidade brasileira e se a metodologia está correta conforme os padrões estatísticos. Informe se encontrou alguma inconsistência significativa ou se os dados são altamente confiáveis.

DADOS DO INDICADOR (JSON):
${JSON.stringify(info, null, 2)}`;

    const concluir = () => {
      setExibirAviso(true);
      setTimeout(() => setExibirAviso(false), 10000);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(prompt)
        .then(concluir)
        .catch(() => copiarFallback(prompt, concluir));
    } else {
      copiarFallback(prompt, concluir);
    }
  };

  const dadosComEventos = React.useMemo(() => {
    if (!Array.isArray(info.eventos_externos)) return dados;

    return dados.map((item) => {
      const eventos = info.eventos_externos.filter((evento) => (evento.ano || evento.data) === item.ano);
      return { ...item, _eventos: eventos };
    });
  }, [dados, info.eventos_externos]);

  const renderField = ([key, label]) => {
    const value = info[key];
    if (!value) return null;
    const fieldClassName = `field-block field-block--${key}`;

    if (key === "eventos_externos" && Array.isArray(value)) {
      const eventosOrdenados = [...value].sort((a, b) => (a.ano || a.data) - (b.ano || b.data));
      const metadeEventos = Math.ceil(eventosOrdenados.length / 2);
      const colunasEventos = [eventosOrdenados.slice(0, metadeEventos), eventosOrdenados.slice(metadeEventos)].filter(
        (coluna) => coluna.length > 0,
      );

      return (
        <div key={key} className={fieldClassName}>
          <strong className="field-label">{label}</strong>
          <div className="event-list">
            {colunasEventos.map((coluna, colunaIndex) => (
              <div key={colunaIndex} className="event-list__column">
                {coluna.map((evento, index) => (
                  <div key={`${colunaIndex}-${index}`} className="event-item">
                    <span className="event-item__title">
                      {evento.ano || evento.data}: {evento.nome}
                    </span>
                    <p className="event-item__desc">{evento.descricao}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (key === "fontes_links" && Array.isArray(value)) {
      return (
        <div key={key} className={fieldClassName}>
          <strong className="field-label">{label}</strong>
          <ul className="sources-list">
            {value.map((link, index) => (
              <li key={index}>
                {link.url ? (
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.titulo || link.url}
                  </a>
                ) : (
                  link.titulo
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    let displayValue = value;
    if (key === "validacao" && typeof value === "object" && value !== null) {
      displayValue = `${value.modelo || ""}${value.data ? ` (${value.data})` : ""}${value.observacoes ? ` - ${value.observacoes}` : ""}`;
    }

    return (
      <div key={key} className={fieldClassName}>
        {key !== "descricao" && <strong className="field-label">{label}</strong>}
        <div>{typeof displayValue === "object" ? JSON.stringify(displayValue) : displayValue}</div>
        {key === "validacao" && (
          <button onClick={copiarParaIA} className="action-btn validation-ai-btn" title="Exportar para validação em IA">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
            <span>Validar com IA</span>
          </button>
        )}
      </div>
    );
  };

  const fontePrincipal = info.fonte;
  const camposFixosDaGrade = fixedFields.filter(([key]) => key !== "fonte");
  const temExtras = extraFields.some(([key]) => info[key]);

  return (
    <div
      className={"chart-box" + (compacta ? " chart-box--compact" : "")}
      style={{
        "--chart-accent": cor,
        "--chart-accent-medium": hexToRgba(cor, 0.32),
        "--chart-accent-soft": hexToRgba(cor, 0.24),
        "--chart-accent-wash": hexToRgba(cor, 0.1),
      }}
    >
      <div className="chart-head">
        <button type="button" className="chart-close-btn" onClick={onFechar} title="Remover indicador">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="chart-title">
          <div className="chart-title__left">
            <span className="chart-title__text">{info.label}</span>
            {info.fonte_sigla && <span className="chart-title__source">{info.fonte_sigla}</span>}
            <span className="chart-title__unit">{info.unidade}</span>
          </div>
        </div>
      </div>

      <div className="chart-primary-card">
        {info.descricao && <div className="chart-description">{info.descricao}</div>}

        {comDados.length === 0 ? (
          <div className="no-data">Sem dados no período selecionado.</div>
        ) : (
          <div className="chart-visual">
            <ResponsiveContainer width="100%" height={alturaGrafico}>
              <LineChart data={dadosComEventos} margin={margemGrafico}>
                {PRES_ANOS.filter(
                  (presidente) => Math.min(anoFim + 1, presidente.fim) > Math.max(anoIni, presidente.ini),
                ).flatMap((presidente, index) => {
                  const x1 = presidente.ini - 0.5;
                  const x2 = presidente.fim - 0.5;
                  let labelMandato = null;

                  if (isMobile) {
                    labelMandato = (props) => {
                      const { viewBox } = props;
                      if (!viewBox) return null;
                      const cx = viewBox.x + viewBox.width / 2 + 4;
                      const startY = viewBox.y + viewBox.height - 7;

                      return (
                        <text
                          x={cx}
                          y={startY}
                          fill={presidente.cor}
                          fontSize={11}
                          fontWeight="bold"
                          opacity={0.35}
                          textAnchor="start"
                          transform={`rotate(-90, ${cx}, ${startY})`}
                        >
                          {presidente.nome}
                        </text>
                      );
                    };
                  } else {
                    labelMandato = {
                      value: presidente.nome,
                      position: "insideBottom",
                      fill: presidente.cor,
                      fontSize: 11,
                      fontWeight: "bold",
                      dy: -5,
                      fillOpacity: 0.35,
                    };
                  }

                  return [
                    <ReferenceArea
                      key={`area-${index}`}
                      x1={x1}
                      x2={x2}
                      fill={presidente.cor}
                      fillOpacity={0.1}
                      ifOverflow="hidden"
                    />,
                    <ReferenceArea
                      key={`label-${index}`}
                      x1={x1}
                      x2={x2}
                      fill="transparent"
                      ifOverflow="hidden"
                      label={labelMandato}
                    />,
                  ];
                })}

                {ticksY
                  .filter((tick) => tick !== 0)
                  .map((tick) => (
                    <ReferenceLine
                      key={`tick-y-${tick}`}
                      y={tick}
                      stroke="#172033"
                      strokeOpacity={0.12}
                      strokeDasharray="3 5"
                    />
                  ))}
                <ReferenceLine y={0} stroke="#172033" strokeOpacity={0.28} strokeWidth={1.2} />

                <XAxis
                  dataKey="ano"
                  type="number"
                  domain={[anoIni, anoFim]}
                  stroke="#6b7a90"
                  fontSize={isMobile ? 10 : 12}
                  ticks={ticksX}
                  interval={0}
                  tick={isMobile ? { angle: -90, textAnchor: "end", dx: -3, dy: 3 } : true}
                  tickMargin={isMobile ? 8 : 8}
                  allowDecimals={false}
                />
                <YAxis
                  stroke="#6b7a90"
                  fontSize={12}
                  domain={dominioY}
                  ticks={ticksY}
                  tickFormatter={formatarTickEixoY}
                  width={isMobile ? 42 : 52}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;

                    const valor = payload[0]?.value;
                    return (
                      <div className="chart-tooltip" style={{ background: cor }}>
                        <span className="chart-tooltip__year">{label}:</span>
                        <span className="chart-tooltip__value">{formatarValorIndicador(valor)}</span>
                      </div>
                    );
                  }}
                  labelFormatter={(ano) => {
                    const dado = dadosComEventos.find((item) => item.ano === ano);
                    const eventos = dado?._eventos?.map((evento) => evento.nome).join(" | ");
                    return eventos ? `${ano} • ${eventos}` : `${ano}`;
                  }}
                  formatter={(value) => [value != null ? value.toFixed(2) : "-", info.label]}
                  contentStyle={{
                    background: "rgba(9, 17, 31, 0.94)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#f8fafc",
                    fontSize: 13,
                    borderRadius: 16,
                    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.28)",
                    backdropFilter: "blur(14px)",
                  }}
                  labelStyle={{ color: "#f8fafc", fontWeight: 700, marginBottom: 6 }}
                  itemStyle={{ color: "#dbe7ff" }}
                />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke={cor}
                  strokeWidth={1.6}
                  dot={{ r: 1.8, fill: cor, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: cor, stroke: "#ffffff", strokeWidth: 2 }}
                  isAnimationActive={false}
                  connectNulls={false}
                />

                {ultimoDado && (
                  <ReferenceDot x={ultimoDado.ano} y={ultimoDado.valor} r={0} isFront={true}>
                    <Label
                      value={formatarValorIndicador(ultimoDado.valor)}
                      position="right"
                      offset={10}
                      fill={cor}
                      fontSize={11}
                      fontWeight="700"
                    />
                  </ReferenceDot>
                )}

                {Array.isArray(info.eventos_externos) &&
                  [...info.eventos_externos]
                    .sort((a, b) => (a.ano || a.data) - (b.ano || b.data))
                    .map((evento, index) => {
                      const evAno = evento.ano || evento.data;
                      const ponto = dados.find((item) => item.ano === evAno);
                      if (!ponto || ponto.valor == null) return null;

                      const selecionado = eventoAtivo === evento;
                      return (
                        <ReferenceDot
                          key={`ev-${index}`}
                          x={evAno}
                          y={ponto.valor}
                          r={selecionado ? 6 : 4}
                          strokeWidth={2}
                          shape={({ cx, cy }) => {
                            if (cx == null || cy == null) return null;

                            const dir = cy < 84 ? 1 : -1;
                            const pin = [10, 20, 30][index % 3] * dir;
                            const dy = dir === 1 ? 11 : -6;
                            const rotulo = abreviarEvento(evento.nome);

                            return (
                              <g
                                onClick={() => setEventoAtivo(selecionado ? null : evento)}
                                style={{ cursor: "pointer" }}
                              >
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={selecionado ? 6 : 4}
                                  fill={selecionado ? "#fff" : cor}
                                  stroke={selecionado ? cor : "#fff"}
                                  strokeWidth={2}
                                />
                                {!isMobile && (
                                  <g style={{ pointerEvents: "none" }}>
                                    <line
                                      x1={cx}
                                      y1={cy}
                                      x2={cx}
                                      y2={cy + pin}
                                      stroke={cor}
                                      strokeWidth={1}
                                      strokeOpacity={selecionado ? 0.58 : 0.34}
                                      strokeDasharray="2 2"
                                    />
                                    <circle cx={cx} cy={cy + pin} r={1.5} fill={cor} opacity={0.62} />
                                    <text
                                      x={cx}
                                      y={cy + pin}
                                      fill="#fff"
                                      stroke="#fff"
                                      strokeWidth={3}
                                      strokeLinejoin="round"
                                      textAnchor="middle"
                                      dy={dy}
                                      fontSize={9}
                                      fontWeight="bold"
                                      opacity={0.9}
                                    >
                                      {rotulo}
                                    </text>
                                    <text
                                      x={cx}
                                      y={cy + pin}
                                      fill={cor}
                                      textAnchor="middle"
                                      dy={dy}
                                      fontSize={9}
                                      fontWeight="bold"
                                      opacity={selecionado ? 1 : 0.72}
                                    >
                                      {rotulo}
                                    </text>
                                  </g>
                                )}
                              </g>
                            );
                          }}
                        />
                      );
                    })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {fontePrincipal && (
          <div className="chart-source-line">
            <strong>Fonte:</strong> {fontePrincipal}
          </div>
        )}
      </div>

      {!compacta && eventoAtivo && (
        <div className="event-detail">
          <button className="event-detail__close" onClick={() => setEventoAtivo(null)}>
            ×
          </button>
          <div className="event-detail__title">
            {eventoAtivo.ano || eventoAtivo.data}: {eventoAtivo.nome}
          </div>
          <div className="event-detail__desc">{eventoAtivo.descricao}</div>
        </div>
      )}

      {!compacta && (
        <div className="chart-meta" style={{ marginTop: eventoAtivo ? 12 : 0 }}>
          {camposFixosDaGrade.map(renderField)}

          {temExtras && (
            <div className="chart-actions">
              <button className="action-btn" onClick={() => setExpandido(!expandido)}>
                <span>{expandido ? "Ver menos" : "Ver metadados"}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={"expand-btn__icon" + (expandido ? " rotated" : "")}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          )}

          {expandido && <div className="extra-fields">{extraFields.map(renderField)}</div>}
        </div>
      )}

      <ToastValidacao visivel={exibirAviso} aoFechar={() => setExibirAviso(false)} />
    </div>
  );
}

function ToastValidacao({ visivel, aoFechar }) {
  if (!visivel) return null;

  return (
    <div className="validation-toast">
      <div className="toast-header">
        <div className="toast-header__left">
          <div className="toast-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <strong style={{ fontSize: 16 }}>Dados copiados</strong>
        </div>
        <button onClick={aoFechar} className="toast-close">
          ×
        </button>
      </div>
      <div className="toast-body">
        Cole no <strong>ChatGPT</strong>, <strong>Claude</strong> ou <strong>Gemini</strong> para validar os dados.
      </div>
    </div>
  );
}

function copiarFallback(texto, callback) {
  const el = document.createElement("textarea");
  el.value = texto;
  el.style.cssText = "position:fixed;left:-9999px;top:0";
  document.body.appendChild(el);
  el.focus();
  el.select();

  try {
    document.execCommand("copy");
  } catch (error) { }

  document.body.removeChild(el);
  callback();
}

let appMontado = false;

function dadosProntos() {
  return (
    Array.isArray(window.__MANDATOS__) &&
    window.__MANDATOS__.length > 0 &&
    window.__DADOS_ANUAIS__ &&
    Object.keys(window.__DADOS_ANUAIS__).length > 0
  );
}

function mostrarErroCarregamento() {
  const root = document.getElementById("root2");
  if (!root || appMontado) return;

  root.innerHTML = `
    <div style="padding:40px;text-align:center;font-family:Manrope,Segoe UI,sans-serif;color:#d93025;">
      <h2>Erro ao carregar dados</h2>
      <p>Os arquivos de dados locais não foram carregados corretamente.</p>
      <p style="font-size:.95em;color:#64748b;">Verifique se <code>mandatos.js</code>, <code>dados_anuais.js</code> e <code>app.js</code> estão na mesma pasta do HTML.</p>
    </div>
  `;
}

function montarApp() {
  if (appMontado || !dadosProntos()) return;
  const root = document.getElementById("root2");
  if (!root) return;

  appMontado = true;
  ReactDOM.createRoot(root).render(<AppAnual />);
}

window.addEventListener("dataLoaded", montarApp);
montarApp();

window.addEventListener("load", () => {
  setTimeout(() => {
    if (!appMontado) mostrarErroCarregamento();
  }, 300);
});
