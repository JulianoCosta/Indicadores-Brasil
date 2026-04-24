const { useState, useEffect, useMemo, useCallback } = React;
const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea, ReferenceLine, ReferenceDot, Label } = Recharts;

const PRES_ANOS = window.__MANDATOS__ || [];
const CORES_CAT_NORMALIZADAS = window.__CATEGORIAS__ || {};

function tentarCorrigirMojibake(texto) {
  if (typeof texto !== "string") return "";
  try {
    return decodeURIComponent(escape(texto));
  } catch (e) {
    return texto;
  }
}

function normalizarCategoria(cat) {
  return String(cat || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getCategoriaCor(cat) {
  const candidatos = [
    normalizarCategoria(cat),
    normalizarCategoria(tentarCorrigirMojibake(cat))
  ];

  for (const chave of candidatos) {
    if (CORES_CAT_NORMALIZADAS[chave]) return CORES_CAT_NORMALIZADAS[chave];
  }

  return '#79c0ff';
}

function LegendMandatos() {
  return (
    <div className="legend-mandatos-mobile">
      {PRES_ANOS.map(p => (
        <div key={p.nome} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 12, height: 8, backgroundColor: p.cor, opacity: 0.3, borderRadius: 2, border: `1px solid ${p.cor}` }}></span>
          <span>{p.nome}</span>
        </div>
      ))}
    </div>
  );
}

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
    // Função para carregar os dados de forma robusta
    const carregar = () => {
      const json = window.__DADOS_ANUAIS__;
      if (!json) {
        // Se os dados ainda não foram injetados no window, tenta novamente em breve
        setTimeout(carregar, 100);
        return;
      }

      try {
        setMeta(json);
        setDados(json);
        const keys = Object.keys(json);
        if (keys.length > 0) {
          let defaults = keys.filter(k => json[k].padrao === true);
          if (defaults.length === 0) defaults = keys.slice(0, 3);
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

  const filtrado = dados;
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

  const closeMenu = () => setMenuAberto(false);
  const toggleMenu = () => setMenuAberto(!menuAberto);

  if (loading) return <div className="loading" style={{ padding: 48, textAlign: "center", color: "#666" }}>Carregando dados anuais...</div>;
  if (erro) return <div className="loading" style={{ color: '#f85149', padding: 48, textAlign: "center" }}>Erro: {erro}</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <header>
        <div>
          <h1>Brasil 1995-2026</h1>
          <div className="subtitle">Explorador de indicadores anuais e contexto presidencial</div>
        </div>
        <div className="subtitle">
          {selecionados.length} indicador{selecionados.length === 1 ? "" : "es"} selecionado{selecionados.length === 1 ? "" : "s"}
        </div>
      </header>
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* Sidebar */}
        <div className={"sidebar sidebar-anual" + (menuAberto ? " aberto" : "")} style={{ width: 320, flexShrink: 0, borderRight: "1px solid #e1e4e8", padding: "24px 16px 150px 16px", display: "flex", flexDirection: "column", gap: 16, background: "#fff", overflowY: "auto", position: "relative", zIndex: 10 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 8, paddingBottom: 16, borderBottom: "1px solid #e1e4e8" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#656d76", textTransform: "uppercase" }}>Início</label>
              <input type="number" min="1994" max={anoFim} value={anoIni} onChange={e => setAnoIni(+e.target.value)} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #d0d7de", fontSize: 13, fontWeight: "600", outline: "none", color: "#24292f" }} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#656d76", textTransform: "uppercase" }}>Fim</label>
              <input type="number" min={anoIni} max="2026" value={anoFim} onChange={e => setAnoFim(+e.target.value)} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #d0d7de", fontSize: 13, fontWeight: "600", outline: "none", color: "#24292f" }} />
            </div>
          </div>
          <div style={{ borderBottom: "1px solid #e1e4e8", paddingBottom: 10, marginBottom: 0 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: "#24292f", margin: 0, display: "block" }}>Métricas ({meta ? Object.keys(meta).length : 0})</label>
            {meta && (() => {
              const total = Object.keys(meta).length;
              const validadas = Object.values(meta).filter(v => v.validacao).length;
              return (
                <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11, color: "#656d76" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    <strong style={{ color: "#059669" }}>{validadas}</strong> validadas
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", border: "1.5px solid #b1bac4", display: "inline-block" }} />
                    <strong style={{ color: "#656d76" }}>{total - validadas}</strong> não validadas
                  </span>
                </div>
              );
            })()}
          </div>
          {Object.entries(cats).map(([cat, keys]) => (
            <div key={cat}>
              <div className="cat-label" style={{ color: getCategoriaCor(cat), fontSize: 13, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>{cat} ({keys.length})</div>
              <div className="ind-grid" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {keys.map(k => (
                  <button key={k} type="button" className={`ind-btn${selecionados.includes(k) ? ' ativo' : ''}`} style={{ flex: "1 1 100%", minWidth: 0, padding: "6px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-start", transition: "all 0.2s", ...(selecionados.includes(k) ? { backgroundColor: "#f8fafc", color: "#000", border: `1px solid ${getCategoriaCor(cat)}`, boxShadow: `inset 3px 0 0 ${getCategoriaCor(cat)}` } : { border: "1px solid #e1e4e8" }) }} onClick={e => { e.preventDefault(); toggle(k); }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: getCategoriaCor(cat), flexShrink: 0 }}></span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>{meta[k].label}</span>{meta[k].validacao && (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} title="Indicador Validado"><polyline points="20 6 9 17 4 12"></polyline></svg>)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="main-content main-content-anual" style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden", minHeight: 0 }}>
          <LegendMandatos />
          <div className="cards-wrapper" style={{ padding: "16px 24px 150px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
            {selecionados.length === 0 ? (
              <div className="loading" style={{ padding: 48, background: "#fff", borderRadius: 8, border: "1px dashed #d0d7de", color: "#656d76", textAlign: "center" }}>Selecione ao menos um indicador na barra lateral.</div>
            ) : (
              selecionados.map(k => {
                const dadosMetrica = filtrado[k]?.dados || [];
                const dadosFiltrados = dadosMetrica.filter(d => d.ano >= anoIni && d.ano <= anoFim);
                if (!meta || !meta[k]) return null;
                return <GraficoAnual key={k} dados={dadosFiltrados} info={meta[k]} cor={getCategoriaCor(meta[k].cat)} anoIni={anoIni} anoFim={anoFim} />;
              })
            )}
          </div>
        </div>

        {/* Mobile Controls */}
        <button className="menu-btn-anual" onClick={toggleMenu} title="Menu de Indicadores">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {menuAberto ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
          </svg>
        </button>
        <div className={"overlay-anual" + (menuAberto ? " visivel" : "")} onClick={closeMenu}></div>
      </div>
    </div>
  );
}

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
      setTimeout(() => setExibirAviso(false), 15000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(prompt)
        .then(concluir)
        .catch(() => {
          const textArea = document.createElement("textarea");
          textArea.value = prompt;
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";
          textArea.style.top = "0";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try { document.execCommand('copy'); } catch (e) { }
          document.body.removeChild(textArea);
          concluir();
        });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = prompt;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try { document.execCommand('copy'); } catch (e) { }
      document.body.removeChild(textArea);
      concluir();
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
        <div key={key} style={{ fontSize: 13, lineHeight: 1.4 }}>
          <strong style={{ color: '#24292f' }}>{label}:</strong>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {[...value].sort((a, b) => (a.ano || a.data) - (b.ano || b.data)).map((ev, idx) => (
              <div key={idx} style={{ paddingLeft: 8, borderLeft: `2px solid ${cor}44` }}>
                <span style={{ fontWeight: 600, color: '#24292f' }}>{ev.ano || ev.data}: {ev.nome}</span>
                <p style={{ margin: "2px 0 0 0", color: '#656d76', fontSize: 12 }}>{ev.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (key === 'fontes_links' && Array.isArray(value)) {
      return (
        <div key={key} style={{ fontSize: 13, lineHeight: 1.4 }}>
          <strong style={{ color: '#24292f' }}>{label}:</strong>
          <ul style={{ margin: "4px 0 0 0", paddingLeft: 20, color: '#656d76' }}>
            {value.map((link, idx) => (
              <li key={idx} style={{ marginBottom: 2 }}>
                {link.url ? (
                  <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0969da', textDecoration: 'none' }}>
                    {link.titulo || link.url}
                  </a>
                ) : link.titulo}
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
      <div key={key} style={{ fontSize: 13, color: '#656d76', lineHeight: 1.4 }}>
        {key !== 'descricao' && <strong style={{ color: '#24292f' }}>{label}: </strong>}
        {typeof displayValue === 'object' ? JSON.stringify(displayValue) : displayValue}
      </div>
    );
  };

  const fixedFields = [
    ['descricao', 'Descrição'],
    ['como_interpretar', 'Como interpretar'],
    ['comparacao_paises', 'Comparação entre países']
  ];


  const temExtras = extraFields.some(([key]) => info[key]);

  return (
    <div className="chart-box">
      <div className="chart-title" style={{ color: cor, padding: isMobile ? "0 8px" : 0, marginBottom: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {info.label}{info.validacao && (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" title="Validado"><polyline points="20 6 9 17 4 12"></polyline></svg>)}
        </div>
        {info.validacao && (
          <button onClick={copiarParaIA} className="export-btn" title="Exportar para validação em IA">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            <span>Validar</span>
          </button>
        )}
      </div>
      <div className="chart-unit" style={{ fontSize: 13, color: '#656d76', marginBottom: 4, padding: isMobile ? "0 8px" : 0 }}>
        <strong style={{ color: '#24292f' }}>{info.unidade}</strong>{info.fonte ? ` – Fonte: ${info.fonte}` : ''}
      </div>
      {comDados.length === 0 ? (
        <div style={{ color: '#656d76', fontSize: 12, padding: '12px 8px' }}>Sem dados no período selecionado.</div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={dadosComEventos} margin={{ top: 10, right: isMobile ? 8 : 16, bottom: 10, left: isMobile ? -10 : 8 }}>
            {PRES_ANOS.filter(p => Math.min(anoFim, p.fim) > Math.max(anoIni, p.ini)).flatMap((p, i) => {
              const x1 = p.ini - 0.5;
              const x2 = p.fim - 0.5;
              return [
                <ReferenceArea key={`area-${i}`} x1={x1} x2={x2} fill={p.cor} fillOpacity={0.08} ifOverflow="hidden" />,
                p.ini >= anoIni ? <ReferenceLine key={`line-${i}`} x={x1} stroke="#000" strokeOpacity={0.2} strokeDasharray="3 3" ifOverflow="hidden" /> : null,
                <ReferenceArea key={`label-${i}`} x1={x1} x2={x2} fill="transparent" ifOverflow="hidden" label={{ value: p.nome, position: 'insideBottom', fill: p.cor, fontSize: 11, fontWeight: "bold", dy: -5 }} />
              ];
            })}
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="ano" type="number" domain={[anoIni, anoFim]} stroke="#9ca3af" fontSize={12} tickCount={10} allowDecimals={false} />
            <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={v => { if (Math.abs(v) >= 1000) return (v / 1000).toFixed(0) + 'k'; return v?.toFixed?.(1) ?? v; }} width={isMobile ? 42 : 52} />

            <Tooltip
              labelFormatter={(ano) => {
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

              const selecionado = eventoAtivo === ev;

              return (
                <ReferenceDot
                  key={`ev-${i}`}
                  x={evAno}
                  y={pt.valor}
                  r={selecionado ? 6 : 4}
                  strokeWidth={2}
                  shape={(props) => {
                    const { cx, cy } = props;
                    if (cx == null || cy == null) return null;

                    // Regra dos 65% para inversão
                    const isVeryHigh = cy < 84;
                    const direction = isVeryHigh ? 1 : -1;
                    const pinHeight = [10, 20, 30][i % 3] * direction;
                    const textDy = direction === 1 ? 11 : -6;

                    return (
                      <g onClick={() => setEventoAtivo(selecionado ? null : ev)} style={{ cursor: 'pointer' }}>
                        <circle cx={cx} cy={cy} r={selecionado ? 6 : 4} fill={selecionado ? '#fff' : cor} stroke={selecionado ? cor : '#fff'} strokeWidth={2} />
                        {!isMobile && (
                          <g style={{ pointerEvents: 'none' }}>
                            <line x1={cx} y1={cy} x2={cx} y2={cy + pinHeight} stroke={cor} strokeWidth={1} strokeOpacity={0.4} strokeDasharray="2 1" />
                            <circle cx={cx} cy={cy + pinHeight} r={1.5} fill={cor} opacity={0.6} />
                            <text x={cx} y={cy + pinHeight} fill="#fff" stroke="#fff" strokeWidth={3} strokeLinejoin="round" textAnchor="middle" dy={textDy} fontSize={9} fontWeight="bold" opacity={0.9}>{ev.nome}</text>
                            <text x={cx} y={cy + pinHeight} fill={cor} textAnchor="middle" dy={textDy} fontSize={9} fontWeight="bold" opacity={selecionado ? 1 : 0.8}>{ev.nome}</text>
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

      {/* Detalhe do Evento Selecionado */}
      {eventoAtivo && (
        <div style={{
          background: '#fff8f0',
          border: '1px solid #ffe3ac',
          borderRadius: 6,
          padding: '10px 12px',
          fontSize: 13,
          marginTop: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          position: 'relative'
        }}>
          <button
            onClick={() => setEventoAtivo(null)}
            style={{ position: 'absolute', right: 8, top: 8, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16 }}
          >✕</button>
          <div style={{ fontWeight: 600, color: '#9a6700', marginBottom: 4 }}>
            {eventoAtivo.ano || eventoAtivo.data}: {eventoAtivo.nome}
          </div>
          <div style={{ color: '#4b5563', lineHeight: 1.4 }}>
            {eventoAtivo.descricao}
          </div>
        </div>
      )}

      {/* Metadados do Indicador */}
      <div style={{ marginTop: eventoAtivo ? 12 : 0, display: "flex", flexDirection: "column", gap: 8, padding: isMobile ? "0 8px" : 0 }}>
        {fixedFields.map(renderField)}

        {temExtras && (
          <button
            onClick={() => setExpandido(!expandido)}
            style={{
              background: 'none',
              border: 'none',
              color: '#0969da',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 4,
              width: 'fit-content'
            }}
          >
            {expandido ? 'Ver menos' : 'Ver metadados completos'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandido ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        )}

        {expandido && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4, borderTop: '1px solid #f0f2f5', marginTop: 4 }}>
            {extraFields.map(renderField)}
          </div>
        )}
      </div>
      <ToastValidacao visivel={exibirAviso} aoFechar={() => setExibirAviso(false)} />
    </div>
  );
}


function ToastValidacao({ visivel, aoFechar }) {
  if (!visivel) return null;
  return (
    <div className="validation-toast">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#28a745", borderRadius: "50%", padding: 6, display: "flex" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <strong style={{ fontSize: 16 }}>Dados Copiados!</strong>
        </div>
        <button onClick={aoFechar} style={{ background: "none", border: "none", color: "#656d76", cursor: "pointer", padding: 0, fontSize: 28, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
      </div>
      <div style={{ padding: "10px 14px", background: "#f6f8fa", border: "1px solid #d0d7de", borderRadius: 8, fontSize: 15, color: "#24292f" }}>
        Cole (Ctrl+V) no <strong>ChatGPT</strong>, <strong>Claude</strong> ou  <strong>Gemini</strong> para validar os dados.
      </div>
    </div>
  );
}


let appMontado = false;

function dadosProntos() {
  const mandatos = Array.isArray(window.__MANDATOS__) ? window.__MANDATOS__ : [];
  const dados = window.__DADOS_ANUAIS__;
  return mandatos.length > 0 && dados && Object.keys(dados).length > 0;
}

function mostrarErroCarregamento() {
  const root = document.getElementById('root2');
  if (!root || appMontado) return;

  root.innerHTML = `
        <div style="padding: 40px; text-align: center; font-family: sans-serif; color: #d93025;">
            <h2>Erro ao carregar dados</h2>
            <p>Os arquivos de dados locais nao foram carregados corretamente.</p>
            <p style="font-size: 0.9em; color: #666;">Verifique se <code>mandatos.js</code>, <code>dados_anuais.js</code> e <code>app.js</code> estao na mesma pasta do HTML.</p>
        </div>
    `;
}

function montarApp() {
  if (appMontado || !dadosProntos()) return;

  const root = document.getElementById('root2');
  if (!root) return;

  console.log('Data loaded, mounting app...');
  appMontado = true;
  ReactDOM.createRoot(root).render(<AppAnual />);
}

window.addEventListener('dataLoaded', montarApp);
montarApp();

window.addEventListener('load', () => {
  setTimeout(() => {
    if (!appMontado) {
      mostrarErroCarregamento();
    }
  }, 300);
});
