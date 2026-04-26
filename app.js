const { useState, useEffect, useMemo, useCallback } = React;
const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine, ReferenceDot } = Recharts;

// ── Helpers ──────────────────────────────────────────────────

function tentarCorrigirMojibake(texto) {
  if (typeof texto !== "string") return "";
  try { return decodeURIComponent(escape(texto)); } catch (e) { return texto; }
}

function normalizarCategoria(cat) {
  return String(cat || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const PRES_ANOS = window.__MANDATOS__ || [];

function getCategoriaCor(cat) {
  const raw = window.__CATEGORIAS__ || {};
  const search = normalizarCategoria(cat);
  
  // Search for the category by normalizing keys on the fly
  for (const k in raw) {
    if (normalizarCategoria(k) === search) return raw[k];
  }
  
  // Fallback for mojibake or other issues
  const fixedSearch = normalizarCategoria(tentarCorrigirMojibake(cat));
  for (const k in raw) {
    if (normalizarCategoria(k) === fixedSearch) return raw[k];
  }
  
  return '#79c0ff';
}

// ── Campos exibidos abaixo do gráfico ────────────────────────

// Sempre visíveis
const fixedFields = [
  ['descricao', 'Descrição'],
  ['como_interpretar', 'Como interpretar'],
  ['comparacao_paises', 'Comparação entre países']
];

// Exibidos ao expandir
const extraFields = [
  ['nivel_confiabilidade', 'Nível de Confiabilidade'],
  ['metodologia', 'Metodologia'],
  ['historico_metodologia', 'Histórico da Metodologia'],
  ['abrangencia', 'Abrangência'],
  ['periodicidade', 'Periodicidade'],
  ['eventos_externos', 'Eventos externos'],
  ['validacao', 'Validação'],
  ['fontes_links', 'Fontes e Links']
];

// ── Componentes auxiliares ───────────────────────────────────

function LegendMandatos() {
  return (
    <div className="legend-mandatos-mobile">
      {PRES_ANOS.map(p => (
        <div key={p.nome} className="legend-mandatos-item">
          <span className="legend-mandatos-swatch" style={{ backgroundColor: p.cor, border: `1px solid ${p.cor}` }} />
          <span>{p.nome}</span>
        </div>
      ))}
    </div>
  );
}

// ── AppAnual ─────────────────────────────────────────────────

function AppAnual() {
  const [meta, setMeta] = useState(null);
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [selecionados, setSelecionados] = useState([]);
  const [anoIni, setAnoIni] = useState(1995);
  const [anoFim, setAnoFim] = useState(2026);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    const carregar = () => {
      const json = window.__DADOS_ANUAIS__;
      if (!json) { setTimeout(carregar, 100); return; }
      try {
        setMeta(json);
        setDados(json);
        const keys = Object.keys(json);
        if (keys.length > 0) {
          const defaults = keys.filter(k => json[k].padrao === true);
          setSelecionados(defaults);
        }
        setLoading(false);
      } catch (e) {
        setErro(e.message);
        setLoading(false);
      }
    };
    carregar();
  }, []);

  const cats = useMemo(() => {
    if (!meta) return [];
    const m = {};
    for (const [k, v] of Object.entries(meta)) {
      if (!m[v.cat]) m[v.cat] = [];
      m[v.cat].push(k);
    }
    return m;
  }, [meta]);

  const toggle = useCallback(k => {
    setSelecionados(prev => prev.includes(k) ? prev.filter(x => x !== k) : [k, ...prev]);
  }, []);

  if (loading) return <div className="empty-state" style={{ marginTop: 48 }}>Carregando dados anuais...</div>;
  if (erro) return <div className="empty-state" style={{ color: '#f85149' }}>Erro: {erro}</div>;

  const totalValidadas = meta ? Object.values(meta).filter(v => v.validacao).length : 0;

  return (
    <div className="app-layout">
      <header>
        <div>
          <h1>Brasil 1995-2026</h1>
          <div className="subtitle">Explorador de indicadores anuais e contexto presidencial</div>
        </div>
        <div className="subtitle">
          {selecionados.length} indicador{selecionados.length === 1 ? "" : "es"} selecionado{selecionados.length === 1 ? "" : "s"}
        </div>
      </header>

      <div className="app-body">

        {/* Sidebar */}
        <div className={"sidebar sidebar-anual" + (menuAberto ? " aberto" : "")}>

          {/* Filtro de período */}
          <div className="sidebar-date-range">
            <div className="sidebar-date-group">
              <label>Início</label>
              <input type="number" min="1994" max={anoFim} value={anoIni} onChange={e => setAnoIni(+e.target.value)} />
            </div>
            <div className="sidebar-date-group">
              <label>Fim</label>
              <input type="number" min={anoIni} max="2026" value={anoFim} onChange={e => setAnoFim(+e.target.value)} />
            </div>
          </div>

          <div className="sidebar-metrics-header">
            <span className="sidebar-metrics-title">INDICADORES ({totalValidadas})</span>
          </div>

          {/* Lista de métricas por categoria */}
          {Object.entries(cats).map(([cat, keys]) => {
            const validados = keys.filter(k => meta[k].validacao);
            if (validados.length === 0) return null;
            return (
              <div key={cat}>
                <div className="cat-label" style={{ color: getCategoriaCor(cat) }}>{cat} ({validados.length})</div>
                <div className="ind-grid">
                  {validados.map(k => (
                    <button
                      key={k}
                      type="button"
                      className={"ind-btn" + (selecionados.includes(k) ? ' ativo' : '')}
                      style={selecionados.includes(k) ? {
                        border: `1px solid ${getCategoriaCor(cat)}`,
                        boxShadow: `inset 3px 0 0 ${getCategoriaCor(cat)}`
                      } : undefined}
                      onClick={e => { e.preventDefault(); toggle(k); }}
                    >
                      <span className="ind-dot" style={{ backgroundColor: getCategoriaCor(cat) }} />
                      <span className="ind-label">{meta[k].label}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} title="Indicador Validado">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Área principal */}
        <div className="main-content main-content-anual">
          <LegendMandatos />
          <div className="cards-wrapper">
            {selecionados.length === 0 ? (
              <div className="empty-state">Selecione pelo menos um indicador no menu.</div>
            ) : (
              selecionados.map(k => {
                const dadosMetrica = dados[k]?.dados || [];
                const dadosFiltrados = dadosMetrica.filter(d => d.ano >= anoIni && d.ano <= anoFim);
                if (!meta || !meta[k]) return null;
                return <GraficoAnual key={k} dados={dadosFiltrados} info={meta[k]} cor={getCategoriaCor(meta[k].cat)} anoIni={anoIni} anoFim={anoFim} />;
              })
            )}
          </div>
        </div>

        {/* Controles mobile */}
        <button className="menu-btn-anual" onClick={() => setMenuAberto(!menuAberto)} title="Menu de Indicadores">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {menuAberto ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
          </svg>
        </button>
        <div className={"overlay-anual" + (menuAberto ? " visivel" : "")} onClick={() => setMenuAberto(false)} />
      </div>
    </div>
  );
}

// ── GraficoAnual ─────────────────────────────────────────────

function GraficoAnual({ dados, info, cor, anoIni, anoFim }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const comDados = dados.filter(d => d.valor != null);
  const [expandido, setExpandido] = React.useState(false);
  const [eventoAtivo, setEventoAtivo] = React.useState(null);
  const [exibirAviso, setExibirAviso] = React.useState(false);

  const copiarParaIA = () => {
    const prompt = `Instruções para a IA: Por favor, valide a confiabilidade dos dados do indicador abaixo. Verifique se os valores numéricos batem com a fonte oficial citada (${info.fonte}), se a descrição e os eventos históricos condizem com a realidade brasileira e se a metodologia está correta conforme os padrões estatísticos. Informe se encontrou alguma inconsistência significativa ou se os dados são altamente confiáveis.

DADOS DO INDICADOR (JSON):
${JSON.stringify(info, null, 2)}`;

    const concluir = () => {
      setExibirAviso(true);
      setTimeout(() => setExibirAviso(false), 10000);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(prompt).then(concluir).catch(() => copiarFallback(prompt, concluir));
    } else {
      copiarFallback(prompt, concluir);
    }
  };

  const dadosComEventos = React.useMemo(() => {
    if (!Array.isArray(info.eventos_externos)) return dados;
    return dados.map(d => {
      const evs = info.eventos_externos.filter(e => (e.ano || e.data) === d.ano);
      return { ...d, _eventos: evs };
    });
  }, [dados, info.eventos_externos]);

  const renderField = ([key, label]) => {
    const value = info[key];
    if (!value) return null;

    if (key === 'eventos_externos' && Array.isArray(value)) {
      return (
        <div key={key} className="field-block">
          <strong className="field-label">{label}:</strong>
          <div className="event-list">
            {[...value].sort((a, b) => (a.ano || a.data) - (b.ano || b.data)).map((ev, idx) => (
              <div key={idx} className="event-item" style={{ borderLeft: `2px solid ${cor}44` }}>
                <span className="event-item__title">{ev.ano || ev.data}: {ev.nome}</span>
                <p className="event-item__desc">{ev.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (key === 'fontes_links' && Array.isArray(value)) {
      return (
        <div key={key} className="field-block">
          <strong className="field-label">{label}:</strong>
          <ul className="sources-list">
            {value.map((link, idx) => (
              <li key={idx}>
                {link.url
                  ? <a href={link.url} target="_blank" rel="noopener noreferrer">{link.titulo || link.url}</a>
                  : link.titulo}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    let displayValue = value;
    if (key === 'validacao' && typeof value === 'object' && value !== null) {
      displayValue = `${value.modelo || ''}${value.data ? ` (${value.data})` : ''}${value.observacoes ? ` - ${value.observacoes}` : ''}`;
    }

    return (
      <div key={key} className="field-block">
        {key !== 'descricao' && <strong className="field-label">{label}: </strong>}
        {typeof displayValue === 'object' ? JSON.stringify(displayValue) : displayValue}
      </div>
    );
  };

  const temExtras = extraFields.some(([key]) => info[key]);

  return (
    <div className="chart-box">
      {/* Cabeçalho */}
      <div className="chart-title" style={{ color: cor }}>
        <div className="chart-title__left">
          {info.label}
          {info.validacao && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" title="Validado">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </div>

      {/* Unidade / Fonte */}
      <div className="chart-unit">
        <strong style={{ color: '#24292f' }}>{info.unidade}</strong>
        {info.fonte ? ` – Fonte: ${info.fonte}` : ''}
      </div>

      {/* Gráfico */}
      {comDados.length === 0 ? (
        <div className="no-data">Sem dados no período selecionado.</div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={dadosComEventos} margin={{ top: 10, right: isMobile ? 8 : 16, bottom: 10, left: isMobile ? -10 : 8 }}>
            {PRES_ANOS.filter(p => Math.min(anoFim, p.fim) > Math.max(anoIni, p.ini)).flatMap((p, i) => {
              const x1 = p.ini - 0.5, x2 = p.fim - 0.5;
              return [
                <ReferenceArea key={`area-${i}`} x1={x1} x2={x2} fill={p.cor} fillOpacity={0.08} ifOverflow="hidden" />,
                p.ini >= anoIni ? <ReferenceLine key={`line-${i}`} x={x1} stroke="#000" strokeOpacity={0.2} strokeDasharray="3 3" ifOverflow="hidden" /> : null,
                <ReferenceArea key={`label-${i}`} x1={x1} x2={x2} fill="transparent" ifOverflow="hidden" label={isMobile
                  ? (props) => {
                    const { viewBox } = props;
                    if (!viewBox) return null;
                    const cx = viewBox.x + viewBox.width / 2 + 4;
                    const startY = viewBox.y + viewBox.height - 7;
                    return (
                      <text
                        x={cx} y={startY}
                        fill={p.cor} fontSize={11} fontWeight="bold" opacity={0.3}
                        textAnchor="start"
                        transform={`rotate(-90, ${cx}, ${startY})`}
                      >{p.nome}</text>
                    );
                  }
                  : { value: p.nome, position: 'insideBottom', fill: p.cor, fontSize: 11, fontWeight: "bold", dy: -5, fillOpacity: 0.6 }
                } />
              ];
            })}
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="ano" type="number" domain={[anoIni, anoFim]} stroke="#9ca3af" fontSize={12} tickCount={10} allowDecimals={false} />
            <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={v => Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v?.toFixed?.(1) ?? v} width={isMobile ? 42 : 52} />
            <Tooltip
              labelFormatter={ano => {
                const d = dadosComEventos.find(x => x.ano === ano);
                const evs = d?._eventos?.map(e => e.nome).join(" | ");
                return evs ? `${ano} • ${evs}` : `${ano}`;
              }}
              formatter={v => [v != null ? v.toFixed(2) : '-', info.label]}
              contentStyle={{ background: '#fff', border: '1px solid #d0d7de', fontSize: 14, borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}
            />
            <Line type="monotone" dataKey="valor" stroke={cor} strokeWidth={1.5} dot={{ r: 2, fill: cor, strokeWidth: 0 }} activeDot={{ r: 4 }} isAnimationActive={false} connectNulls={false} />
            {Array.isArray(info.eventos_externos) && [...info.eventos_externos].sort((a, b) => (a.ano || a.data) - (b.ano || b.data)).map((ev, i) => {
              const evAno = ev.ano || ev.data;
              const pt = dados.find(d => d.ano === evAno);
              if (!pt || pt.valor == null) return null;
              const sel = eventoAtivo === ev;
              return (
                <ReferenceDot key={`ev-${i}`} x={evAno} y={pt.valor} r={sel ? 6 : 4} strokeWidth={2}
                  shape={({ cx, cy }) => {
                    if (cx == null || cy == null) return null;
                    const dir = cy < 84 ? 1 : -1;
                    const pin = [10, 20, 30][i % 3] * dir;
                    const dy = dir === 1 ? 11 : -6;
                    return (
                      <g onClick={() => setEventoAtivo(sel ? null : ev)} style={{ cursor: 'pointer' }}>
                        <circle cx={cx} cy={cy} r={sel ? 6 : 4} fill={sel ? '#fff' : cor} stroke={sel ? cor : '#fff'} strokeWidth={2} />
                        {!isMobile && (
                          <g style={{ pointerEvents: 'none' }}>
                            <line x1={cx} y1={cy} x2={cx} y2={cy + pin} stroke={cor} strokeWidth={1} strokeOpacity={0.4} strokeDasharray="2 1" />
                            <circle cx={cx} cy={cy + pin} r={1.5} fill={cor} opacity={0.6} />
                            <text x={cx} y={cy + pin} fill="#fff" stroke="#fff" strokeWidth={3} strokeLinejoin="round" textAnchor="middle" dy={dy} fontSize={9} fontWeight="bold" opacity={0.9}>{ev.nome}</text>
                            <text x={cx} y={cy + pin} fill={cor} textAnchor="middle" dy={dy} fontSize={9} fontWeight="bold" opacity={sel ? 1 : 0.8}>{ev.nome}</text>
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
      )}

      {/* Detalhe do evento selecionado */}
      {eventoAtivo && (
        <div className="event-detail">
          <button className="event-detail__close" onClick={() => setEventoAtivo(null)}>✕</button>
          <div className="event-detail__title">{eventoAtivo.ano || eventoAtivo.data}: {eventoAtivo.nome}</div>
          <div className="event-detail__desc">{eventoAtivo.descricao}</div>
        </div>
      )}

      {/* Metadados */}
      <div className="chart-meta" style={{ marginTop: eventoAtivo ? 12 : 0 }}>
        {fixedFields.map(renderField)}

        {/* Ações */}
        {info.validacao && (
          <div className="chart-actions">
            <button onClick={copiarParaIA} className="export-btn" title="Exportar para validação em IA">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
              <span>Validar indicador com IA</span>
            </button>
          </div>
        )}

        {temExtras && (
          <button className="expand-btn" onClick={() => setExpandido(!expandido)}>
            {expandido ? 'Ver menos' : 'Ver metadados completos'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={"expand-btn__icon" + (expandido ? " rotated" : "")}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}

        {expandido && (
          <div className="extra-fields">
            {extraFields.map(renderField)}
          </div>
        )}
      </div>

      <ToastValidacao visivel={exibirAviso} aoFechar={() => setExibirAviso(false)} />
    </div>
  );
}

// ── ToastValidacao ───────────────────────────────────────────

function ToastValidacao({ visivel, aoFechar }) {
  if (!visivel) return null;
  return (
    <div className="validation-toast">
      <div className="toast-header">
        <div className="toast-header__left">
          <div className="toast-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <strong style={{ fontSize: 16 }}>Dados Copiados!</strong>
        </div>
        <button onClick={aoFechar} className="toast-close">×</button>
      </div>
      <div className="toast-body">
        Cole no <strong>ChatGPT</strong>, <strong>Claude</strong> ou <strong>Gemini</strong> para validar os dados.
      </div>
    </div>
  );
}

// ── Helpers de cópia ─────────────────────────────────────────

function copiarFallback(texto, callback) {
  const el = document.createElement("textarea");
  el.value = texto;
  el.style.cssText = "position:fixed;left:-9999px;top:0";
  document.body.appendChild(el);
  el.focus();
  el.select();
  try { document.execCommand('copy'); } catch (e) { }
  document.body.removeChild(el);
  callback();
}

// ── Bootstrap ────────────────────────────────────────────────

let appMontado = false;

function dadosProntos() {
  return Array.isArray(window.__MANDATOS__) && window.__MANDATOS__.length > 0
    && window.__DADOS_ANUAIS__ && Object.keys(window.__DADOS_ANUAIS__).length > 0;
}

function mostrarErroCarregamento() {
  const root = document.getElementById('root2');
  if (!root || appMontado) return;
  root.innerHTML = `
    <div style="padding:40px;text-align:center;font-family:sans-serif;color:#d93025;">
      <h2>Erro ao carregar dados</h2>
      <p>Os arquivos de dados locais não foram carregados corretamente.</p>
      <p style="font-size:.9em;color:#666;">Verifique se <code>mandatos.js</code>, <code>dados_anuais.js</code> e <code>app.js</code> estão na mesma pasta do HTML.</p>
    </div>`;
}

function montarApp() {
  if (appMontado || !dadosProntos()) return;
  const root = document.getElementById('root2');
  if (!root) return;
  appMontado = true;
  ReactDOM.createRoot(root).render(<AppAnual />);
}

window.addEventListener('dataLoaded', montarApp);
montarApp();

window.addEventListener('load', () => {
  setTimeout(() => { if (!appMontado) mostrarErroCarregamento(); }, 300);
});
