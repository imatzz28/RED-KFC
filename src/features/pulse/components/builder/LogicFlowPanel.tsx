import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Question, Survey } from '@/types';
import {
  ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw, Play, Flag, GitFork,
  Type, AlignLeft, CircleDot, CheckSquare, Star, ToggleLeft,
  Calendar, Upload, X, Trash2, ChevronDown, ChevronRight, Sliders
} from 'lucide-react';

const NW = 260;           // node width (px)
const NH_COLLAPSED = 68;  // collapsed node height
const NH_HDR = 68;        // node header height
const OPT_H = 32;         // option row height
const NPB = 10;           // node bottom padding
const PORT_R = 6;         // port dot radius
const H_GAP = 180;        // horizontal gap between columns
const V_GAP = 50;         // vertical gap between rows
const INIT_ZOOM = 0.85;

const BRANCH_COLORS = [
  '#8b5cf6', '#3b82f6', '#f59e0b', '#10b981',
  '#ef4444', '#f97316', '#06b6d4', '#ec4899',
];
const GENERAL_COLOR = '#E4002B';
const SEQ_COLOR = '#94a3b8';

type V2 = { x: number; y: number };
type PosMap = Record<string, V2>;

function getNodeHeight(q: Question, isExpanded: boolean): number {
  if (!isExpanded) return NH_COLLAPSED;
  const opts = getDisplayOptions(q);
  return NH_HDR + Math.max(1, opts.length) * OPT_H + NPB;
}

function getPortOffsetY(portIdx: number, isExpanded: boolean): number {
  if (!isExpanded || portIdx === -1) {
    return NH_COLLAPSED / 2;
  }
  return NH_HDR + portIdx * OPT_H + OPT_H / 2;
}

function getDisplayOptions(q: Question): Array<{ id: string; text: string; value: string; next_question_id?: string }> {
  if (q.type === 'yes_no') {
    return q.options?.length
      ? q.options
      : [{ id: 'yes', text: 'Sí', value: 'si' }, { id: 'no', text: 'No', value: 'no' }];
  }
  if (['single_choice', 'multiple_choice', 'ordering'].includes(q.type)) {
    return q.options ?? [];
  }
  return [{ id: '__next__', text: 'Siguiente pregunta', value: '__next__' }];
}

function autoLayout(questions: Question[], expandedMap: Record<string, boolean>): PosMap {
  const sorted = [...questions].sort((a, b) => a.order - b.order);
  if (!sorted.length) return {};

  const jumpTargets = new Set<string>();
  const outEdges = new Map<string, string[]>();

  sorted.forEach(q => {
    const targets: string[] = [];
    q.jump_rules?.forEach(r => {
      if (r.target_question_id && !targets.includes(r.target_question_id)) {
        targets.push(r.target_question_id);
        jumpTargets.add(r.target_question_id);
      }
    });
    q.options?.forEach(o => {
      if (o.next_question_id && !targets.includes(o.next_question_id)) {
        targets.push(o.next_question_id);
        jumpTargets.add(o.next_question_id);
      }
    });
    if (targets.length) outEdges.set(q.id, targets);
  });

  const colMap = new Map<string, number>();
  const rowMap = new Map<string, number>();
  let maxRow = 0;

  function place(id: string, col: number, row: number, visited: Set<string>) {
    if (visited.has(id)) return;
    visited.add(id);
    colMap.set(id, col);
    rowMap.set(id, row);
    maxRow = Math.max(maxRow, row);

    const q = sorted.find(x => x.id === id);
    if (!q) return;

    const targets = outEdges.get(id) ?? [];
    targets.forEach((tid, i) => {
      if (visited.has(tid)) return;
      const tRow = i === 0 ? row : ++maxRow;
      place(tid, col + 1, tRow, visited);
    });

    const qIdx = sorted.findIndex(x => x.id === id);
    const next = sorted[qIdx + 1];
    if (next && !jumpTargets.has(next.id) && !visited.has(next.id)) {
      place(next.id, col + 1, row, visited);
    }
  }

  const visited = new Set<string>();
  const startQ = sorted.find(q => !jumpTargets.has(q.id)) ?? sorted[0];
  if (startQ) place(startQ.id, 0, 0, visited);

  sorted.forEach(q => {
    if (!visited.has(q.id)) {
      colMap.set(q.id, sorted.findIndex(x => x.id === q.id));
      rowMap.set(q.id, ++maxRow);
    }
  });

  const rowHeights = new Map<number, number>();
  sorted.forEach(q => {
    const r = rowMap.get(q.id) ?? 0;
    const isExp = !!expandedMap[q.id];
    rowHeights.set(r, Math.max(rowHeights.get(r) ?? 0, getNodeHeight(q, isExp)));
  });

  const rowY = new Map<number, number>();
  let cy = 100;
  for (let r = 0; r <= maxRow; r++) {
    rowY.set(r, cy);
    cy += (rowHeights.get(r) ?? NH_COLLAPSED) + V_GAP;
  }

  const pos: PosMap = {};
  sorted.forEach(q => {
    pos[q.id] = {
      x: 100 + (colMap.get(q.id) ?? 0) * (NW + H_GAP),
      y: rowY.get(rowMap.get(q.id) ?? 0) ?? 100,
    };
  });
  return pos;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  short_text: Type, long_text: AlignLeft, single_choice: CircleDot,
  multiple_choice: CheckSquare, rating: Star, yes_no: ToggleLeft,
  date: Calendar, file_upload: Upload,
};

interface PortMenu {
  sourceId: string;
  portType: 'general' | 'option';
  portIdx: number;
  label: string;
  currentTarget: string;
  screenX: number;
  screenY: number;
}

interface LogicFlowPanelProps {
  survey: Survey;
  onUpdateQuestion: (q: Question) => void;
}

export function LogicFlowPanel({ survey, onUpdateQuestion }: LogicFlowPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<V2>({ x: 60, y: 40 });
  const [zoom, setZoom] = useState(INIT_ZOOM);
  const [portMenu, setPortMenu] = useState<PortMenu | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanningState, setIsPanningState] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const dragging = useRef<{ id: string; startMouse: V2; startPos: V2 } | null>(null);
  const panning = useRef<{ startMouse: V2; startPan: V2 } | null>(null);
  const isDraggingNode = useRef(false);

  const questions = useMemo(
    () => [...(survey.questions ?? [])].sort((a, b) => a.order - b.order),
    [survey.questions]
  );

  const initialLayout = useMemo(() => autoLayout(questions, expandedNodes), [questions, expandedNodes]);
  const [customPositions, setCustomPositions] = useState<PosMap>({});
  const positions = useMemo(() => ({ ...initialLayout, ...customPositions }), [initialLayout, customPositions]);

  const setPositions = useCallback((updater: PosMap | ((prev: PosMap) => PosMap)) => {
    if (typeof updater === 'function') {
      setCustomPositions(prev => updater({ ...initialLayout, ...prev }));
    } else {
      setCustomPositions(updater);
    }
  }, [initialLayout]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const toggleExpandNode = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedNodes(prev => {
      const next = { ...prev, [id]: !prev[id] };
      setPositions(autoLayout(questions, next));
      return next;
    });
  };

  // Canvas pan / node drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const nodeEl = (e.target as HTMLElement).closest('[data-nodeid]') as HTMLElement | null;
    if (nodeEl) {
      const id = nodeEl.dataset.nodeid!;
      dragging.current = {
        id,
        startMouse: { x: e.clientX, y: e.clientY },
        startPos: { ...(positions[id] || { x: 100, y: 100 }) },
      };
      isDraggingNode.current = false;
    } else {
      panning.current = {
        startMouse: { x: e.clientX, y: e.clientY },
        startPan: { ...pan },
      };
      setIsPanningState(true);
    }
  }, [positions, pan]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging.current) {
      isDraggingNode.current = true;
      const { id, startMouse, startPos } = dragging.current;
      const dx = (e.clientX - startMouse.x) / zoom;
      const dy = (e.clientY - startMouse.y) / zoom;
      setPositions(prev => ({ ...prev, [id]: { x: startPos.x + dx, y: startPos.y + dy } }));
    } else if (panning.current) {
      const dx = e.clientX - panning.current.startMouse.x;
      const dy = e.clientY - panning.current.startMouse.y;
      setPan({ x: panning.current.startPan.x + dx, y: panning.current.startPan.y + dy });
    }
  }, [zoom, setPositions]);

  const onMouseUp = useCallback(() => {
    dragging.current = null;
    panning.current = null;
    setIsPanningState(false);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    setZoom(z => Math.max(0.25, Math.min(2.5, z - e.deltaY * 0.0008)));
  }, []);

  const handlePortClick = useCallback((
    sourceId: string, portType: 'general' | 'option', portIdx: number,
    label: string, currentTarget: string, screenX: number, screenY: number
  ) => {
    setPortMenu({ sourceId, portType, portIdx, label, currentTarget, screenX, screenY });
  }, []);

  const applyJump = useCallback((targetId: string) => {
    if (!portMenu) return;
    const { sourceId, portType, portIdx } = portMenu;
    const q = questions.find(x => x.id === sourceId);
    if (!q) { setPortMenu(null); return; }

    let newRules = [...(q.jump_rules ?? [])];
    const newOpts = q.options ? [...q.options] : undefined;

    if (portType === 'general') {
      const existingAlwaysIdx = newRules.findIndex(r => r.condition_type === 'always');
      if (targetId === '__remove__') {
        if (existingAlwaysIdx >= 0) newRules.splice(existingAlwaysIdx, 1);
      } else if (targetId === '') {
        if (existingAlwaysIdx >= 0) {
          newRules[existingAlwaysIdx] = { ...newRules[existingAlwaysIdx], target_question_id: '' };
        } else {
          newRules.push({ id: `rule_${Date.now()}`, question_id: q.id, condition_type: 'always', value: '__always__', target_question_id: '' });
        }
      } else {
        if (existingAlwaysIdx >= 0) {
          newRules[existingAlwaysIdx] = { ...newRules[existingAlwaysIdx], target_question_id: targetId };
        } else {
          newRules.push({ id: `rule_${Date.now()}`, question_id: q.id, condition_type: 'always', value: '__always__', target_question_id: targetId });
        }
      }
    } else {
      const displayOpts = getDisplayOptions(q);
      const opt = displayOpts[portIdx];

      if (opt && opt.id !== '__next__') {
        const ruleIdx = newRules.findIndex(r => (r.value === opt.value || r.value === opt.id) && r.condition_type !== 'always');
        if (targetId === '__remove__') {
          if (ruleIdx >= 0) newRules.splice(ruleIdx, 1);
          if (newOpts) {
            const oIdx = newOpts.findIndex(o => o.value === opt.value || o.id === opt.id);
            if (oIdx >= 0) newOpts[oIdx] = { ...newOpts[oIdx], next_question_id: undefined };
          }
        } else {
          if (ruleIdx >= 0) newRules[ruleIdx] = { ...newRules[ruleIdx], target_question_id: targetId };
          else newRules.push({ id: `rule_${Date.now()}`, question_id: q.id, condition_type: 'option_equals', value: opt.value || opt.id, target_question_id: targetId });

          if (newOpts) {
            const oIdx = newOpts.findIndex(o => o.value === opt.value || o.id === opt.id);
            if (oIdx >= 0) newOpts[oIdx] = { ...newOpts[oIdx], next_question_id: targetId || undefined };
          }
        }
      }
    }

    onUpdateQuestion({ ...q, jump_rules: newRules, ...(newOpts ? { options: newOpts } : {}) });
    setPortMenu(null);
  }, [portMenu, questions, onUpdateQuestion]);

  const connections = useMemo(() => {
    const result: Array<{
      srcId: string; srcPortIdx: number; isGeneral: boolean; tgtId: string;
      color: string; endOfSurvey: boolean;
    }> = [];

    questions.forEach(q => {
      const isExp = !!expandedNodes[q.id];
      const alwaysRule = q.jump_rules?.find(r => r.condition_type === 'always');
      if (alwaysRule) {
        result.push({
          srcId: q.id,
          srcPortIdx: -1,
          isGeneral: true,
          tgtId: alwaysRule.target_question_id,
          color: GENERAL_COLOR,
          endOfSurvey: alwaysRule.target_question_id === '',
        });
      }

      const displayOpts = getDisplayOptions(q);
      displayOpts.forEach((opt, i) => {
        if (opt.id === '__next__') return;
        const rule = q.jump_rules?.find(r => (r.value === opt.value || r.value === opt.id) && r.condition_type !== 'always');
        const targetId = rule?.target_question_id ?? (q.options?.find(o => o.value === opt.value || o.id === opt.id))?.next_question_id;

        if (targetId !== undefined && targetId !== '') {
          result.push({
            srcId: q.id,
            srcPortIdx: isExp ? i : -1,
            isGeneral: false,
            tgtId: targetId,
            color: BRANCH_COLORS[i % BRANCH_COLORS.length],
            endOfSurvey: false,
          });
        } else if (targetId === '') {
          result.push({
            srcId: q.id,
            srcPortIdx: isExp ? i : -1,
            isGeneral: false,
            tgtId: '',
            color: BRANCH_COLORS[i % BRANCH_COLORS.length],
            endOfSurvey: true,
          });
        }
      });
    });
    return result;
  }, [questions, expandedNodes]);

  const svgPaths = useMemo(() => {
    return connections.map((c, idx) => {
      const srcPos = positions[c.srcId];
      if (!srcPos) return null;
      const srcQ = questions.find(q => q.id === c.srcId);
      if (!srcQ) return null;

      const isExp = !!expandedNodes[c.srcId];
      const sx = srcPos.x + NW;
      const sy = srcPos.y + getPortOffsetY(c.srcPortIdx, isExp);

      if (c.endOfSurvey) {
        return { type: 'end', sx, sy, color: c.color, key: `end-${idx}` };
      }

      const tgtPos = positions[c.tgtId];
      if (!tgtPos) return null;
      const tgtQ = questions.find(q => q.id === c.tgtId);
      if (!tgtQ) return null;

      const tgtExp = !!expandedNodes[c.tgtId];
      const tx = tgtPos.x;
      const ty = tgtPos.y + getNodeHeight(tgtQ, tgtExp) / 2;

      const dx = tx - sx;
      const absDx = Math.abs(dx);
      const ctrl = Math.max(70, absDx * 0.45);
      const goLeft = tx < sx;
      const cp1x = goLeft ? sx + 100 : sx + ctrl;
      const cp1y = sy;
      const cp2x = goLeft ? tx - 100 : tx - ctrl;
      const cp2y = ty;

      return {
        type: 'path',
        d: `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`,
        color: c.color,
        isGeneral: c.isGeneral,
        key: `${c.srcId}-${c.tgtId}-${idx}`,
        tx, ty,
      };
    }).filter(Boolean) as Array<any>;
  }, [connections, positions, questions, expandedNodes]);

  const seqPaths = useMemo(() => {
    return questions.map((q, idx) => {
      const next = questions[idx + 1];
      if (!next) return null;
      const sp = positions[q.id];
      const tp = positions[next.id];
      if (!sp || !tp) return null;
      const sameRow = Math.abs(sp.y - tp.y) < 25;
      if (!sameRow) return null;

      const qExp = !!expandedNodes[q.id];
      const nExp = !!expandedNodes[next.id];
      const sx = sp.x + NW;
      const sy = sp.y + getNodeHeight(q, qExp) / 2;
      const tx = tp.x;
      const ty = tp.y + getNodeHeight(next, nExp) / 2;
      return { sx, sy, tx, ty, key: `seq-${q.id}` };
    }).filter(Boolean) as Array<{ sx: number; sy: number; tx: number; ty: number; key: string }>;
  }, [questions, positions, expandedNodes]);

  const worldSize = useMemo(() => {
    const vals = Object.values(positions) as V2[];
    if (!vals.length) return { w: 3000, h: 2000 };
    return {
      w: Math.max(2400, Math.max(...vals.map(p => p.x)) + NW + 300),
      h: Math.max(1400, Math.max(...vals.map(p => p.y)) + 500),
    };
  }, [positions]);

  const resetLayout = () => {
    setPositions(autoLayout(questions, expandedNodes));
    setPan({ x: 60, y: 40 });
    setZoom(INIT_ZOOM);
    setPortMenu(null);
  };

  const containerStyle = isFullscreen
    ? "fixed inset-0 z-[100] w-screen h-screen bg-slate-50 flex flex-col overflow-hidden animate-in fade-in duration-150"
    : "flex flex-col rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 relative";

  return (
    <div className={containerStyle} style={!isFullscreen ? { height: '84vh' } : {}}>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white text-slate-800 border-b border-slate-200 shrink-0 z-20 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#E4002B] text-white flex items-center justify-center shadow-xs">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight">Editor de Flujo Lógico</span>
            <span className="ml-2 text-[10px] font-bold text-slate-500">
              {questions.length} preguntas · {connections.length} conexión(es)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setZoom(z => Math.min(2.5, +(z + 0.1).toFixed(2)))} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors" title="Zoom +">
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-black w-9 text-center tabular-nums text-slate-700">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.max(0.25, +(z - 0.1).toFixed(2)))} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors" title="Zoom −">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={resetLayout} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors" title="Auto-organizar diagrama">
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2.5 rounded-xl bg-[#E4002B] hover:bg-[#c40024] text-white transition-all shadow-xs cursor-pointer flex items-center justify-center"
            title={isFullscreen ? 'Salir de pantalla completa (ESC)' : 'Ver en Pantalla Completa'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Canvas Container with Mouse Events */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none"
        style={{
          cursor: isPanningState ? 'grabbing' : 'grab',
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundColor: '#f8fafc',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onClick={() => setPortMenu(null)}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'absolute',
            width: worldSize.w,
            height: worldSize.h,
          }}
        >
          {/* SVG Connections Layer */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
            <defs>
              {BRANCH_COLORS.map(c => (
                <marker key={c} id={`arr_${c.slice(1)}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={c} />
                </marker>
              ))}
              <marker id={`arr_${GENERAL_COLOR.slice(1)}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={GENERAL_COLOR} />
              </marker>
              <marker id="arr_seq" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={SEQ_COLOR} />
              </marker>
            </defs>

            {seqPaths.map(p => (
              <line key={p.key} x1={p.sx} y1={p.sy} x2={p.tx} y2={p.ty} stroke={SEQ_COLOR} strokeWidth={1.5} strokeDasharray="6 4" markerEnd="url(#arr_seq)" />
            ))}

            {svgPaths.map(p => {
              if (p.type === 'end') {
                return (
                  <g key={p.key}>
                    <line x1={p.sx} y1={p.sy} x2={p.sx + 55} y2={p.sy} stroke={p.color} strokeWidth={2.5} markerEnd={`url(#arr_${p.color.slice(1)})`} />
                    <circle cx={p.sx + 68} cy={p.sy} r={9} fill={p.color} opacity={0.2} stroke={p.color} strokeWidth={1.5} />
                    <text x={p.sx + 68} y={p.sy + 4} textAnchor="middle" fontSize="9" fill={p.color} fontWeight="900">FIN</text>
                  </g>
                );
              }
              return (
                <path key={p.key} d={p.d} stroke={p.color} strokeWidth={3} fill="none" strokeLinecap="round" markerEnd={`url(#arr_${p.color.slice(1)})`} />
              );
            })}
          </svg>

          {/* INICIO Node Indicator */}
          {questions[0] && positions[questions[0].id] && (
            <div
              style={{
                position: 'absolute',
                left: positions[questions[0].id].x - 76,
                top: positions[questions[0].id].y + getNodeHeight(questions[0], !!expandedNodes[questions[0].id]) / 2 - 14,
              }}
            >
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E4002B] text-white text-[10px] font-black rounded-full shadow-lg">
                <Play className="w-2.5 h-2.5" />
                INICIO
              </div>
            </div>
          )}

          {/* Question Node Cards with data-nodeid attribute for dragging */}
          {questions.map(q => {
            const pos = positions[q.id];
            if (!pos) return null;
            const isExp = !!expandedNodes[q.id];
            const Icon = TYPE_ICONS[q.type] ?? Type;
            const displayOpts = getDisplayOptions(q);
            const totalOptCount = q.options?.length ?? (q.type === 'yes_no' ? 2 : 0);
            const h = getNodeHeight(q, isExp);

            const alwaysRule = q.jump_rules?.find(r => r.condition_type === 'always');
            const hasGeneralJump = alwaysRule !== undefined;
            const generalTargetQ = hasGeneralJump && alwaysRule.target_question_id !== ''
              ? questions.find(x => x.id === alwaysRule.target_question_id)
              : null;

            const specificJumpCount = (q.jump_rules?.filter(r => r.condition_type !== 'always').length ?? 0)
              + (q.options?.filter(o => o.next_question_id).length ?? 0);

            return (
              <div
                key={q.id}
                data-nodeid={q.id}
                style={{ position: 'absolute', left: pos.x, top: pos.y, width: NW, userSelect: 'none' }}
              >
                {/* Input port */}
                <svg style={{ position: 'absolute', left: -PORT_R - 2, top: h / 2 - PORT_R, width: (PORT_R + 2) * 2, height: PORT_R * 2, pointerEvents: 'none' }}>
                  <circle cx={PORT_R + 2} cy={PORT_R} r={PORT_R} fill="white" stroke="#94a3b8" strokeWidth={2} />
                </svg>

                {/* Node Card */}
                <div className={`bg-white rounded-2xl border-2 shadow-md transition-all overflow-visible ${
                  hasGeneralJump
                    ? 'border-[#E4002B]/75 ring-2 ring-[#E4002B]/10'
                    : isExp
                    ? 'border-[#E4002B] shadow-xl'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div
                    onClick={(e) => toggleExpandNode(q.id, e)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-200/80 rounded-t-2xl cursor-pointer hover:bg-slate-100/90 transition-colors relative"
                    style={{ height: NH_HDR }}
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#E4002B] flex items-center justify-center text-white text-[11px] font-black shrink-0">
                      {q.order}
                    </div>

                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-[12px] font-black text-slate-900 leading-snug line-clamp-1">
                        {q.title || 'Sin título'}
                      </p>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Icon className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                          {totalOptCount > 0 ? `${totalOptCount} ops` : q.type.replace(/_/g, ' ')}
                        </span>

                        {hasGeneralJump && (
                          <span className="text-[9px] font-black text-red-700 bg-red-50 px-1.5 py-0.2 rounded-md">
                            {alwaysRule.target_question_id === '' ? '→ ⚑ FIN' : generalTargetQ ? `→ #${generalTargetQ.order}` : '→ General'}
                          </span>
                        )}

                        {!hasGeneralJump && specificJumpCount > 0 && (
                          <span className="text-[9px] font-black text-red-700 bg-red-50 px-1.5 py-0.2 rounded-md">
                            ⚡ {specificJumpCount} saltos
                          </span>
                        )}
                      </div>
                    </div>

                    {totalOptCount > 0 && (
                      <button
                        onClick={(e) => toggleExpandNode(q.id, e)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                        title={isExp ? 'Colapsar opciones' : 'Desplegar opciones'}
                      >
                        {isExp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    )}

                    {/* General Output Port */}
                    <svg
                      style={{ position: 'absolute', right: -(PORT_R + 2), top: NH_HDR / 2 - PORT_R, width: (PORT_R + 2) * 2, height: PORT_R * 2 }}
                      className="cursor-pointer z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePortClick(
                          q.id, 'general', -1, 'Cualquier respuesta (General)',
                          alwaysRule?.target_question_id ?? '', e.clientX, e.clientY
                        );
                      }}
                    >
                      <circle
                        cx={PORT_R + 2} cy={PORT_R} r={PORT_R}
                        fill={hasGeneralJump ? GENERAL_COLOR : 'white'}
                        stroke={GENERAL_COLOR}
                        strokeWidth={2}
                      />
                      {!hasGeneralJump && (
                        <text x={PORT_R + 2} y={PORT_R + 3.5} textAnchor="middle" fontSize="8" fill={GENERAL_COLOR} fontWeight="900">★</text>
                      )}
                    </svg>
                  </div>

                  {/* Options List */}
                  {isExp && (
                    <div className="divide-y divide-slate-100 bg-white rounded-b-2xl overflow-hidden">
                      {displayOpts.map((opt, i) => {
                        const portColor = BRANCH_COLORS[i % BRANCH_COLORS.length];

                        let currentTarget: string | undefined;
                        if (opt.id === '__next__') {
                          currentTarget = alwaysRule?.target_question_id;
                        } else {
                          const rule = q.jump_rules?.find(r => (r.value === opt.value || r.value === opt.id) && r.condition_type !== 'always');
                          currentTarget = rule?.target_question_id
                            ?? q.options?.find(o => o.value === opt.value || o.id === opt.id)?.next_question_id;
                        }
                        const hasTarget = currentTarget !== undefined;
                        const targetQ = hasTarget && currentTarget !== ''
                          ? questions.find(x => x.id === currentTarget)
                          : null;

                        return (
                          <div
                            key={opt.id ?? i}
                            className="flex items-center px-3.5 relative"
                            style={{ height: OPT_H }}
                          >
                            <div className="w-2 h-2 rounded-full shrink-0 mr-2" style={{ background: portColor }} />
                            <span className="text-[11px] font-semibold text-slate-700 flex-1 truncate">
                              {opt.text}
                            </span>

                            {hasTarget && (
                              <span className="text-[9px] font-black mr-2 shrink-0" style={{ color: portColor }}>
                                {currentTarget === '' ? '⚑ FIN' : targetQ ? `→#${targetQ.order}` : '→?'}
                              </span>
                            )}

                            {/* Option Output Port */}
                            <svg
                              style={{ position: 'absolute', right: -(PORT_R + 2), top: OPT_H / 2 - PORT_R, width: (PORT_R + 2) * 2, height: PORT_R * 2 }}
                              className="cursor-pointer z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePortClick(q.id, 'option', i, opt.text, currentTarget ?? '', e.clientX, e.clientY);
                              }}
                            >
                              <circle
                                cx={PORT_R + 2} cy={PORT_R} r={PORT_R}
                                fill={hasTarget ? portColor : 'white'}
                                stroke={portColor}
                                strokeWidth={2}
                              />
                              {!hasTarget && (
                                <text x={PORT_R + 2} y={PORT_R + 3.5} textAnchor="middle" fontSize="8" fill={portColor} fontWeight="900">+</text>
                              )}
                            </svg>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Port Menu Popup */}
      {portMenu && (() => {
        const menuW = 230;
        const left = portMenu.screenX + menuW > (typeof window !== 'undefined' ? window.innerWidth : 1000)
          ? portMenu.screenX - menuW - 10
          : portMenu.screenX + 12;
        const top = Math.min((typeof window !== 'undefined' ? window.innerHeight : 800) - 300, portMenu.screenY - 8);

        return (
          <div
            className="fixed z-[300] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{ left, top, width: menuW }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border-b border-slate-100">
              <div className="text-[11px] font-black text-slate-800 truncate pr-2">
                Conectar: <span className="text-[#E4002B] font-extrabold">&quot;{portMenu.label}&quot;</span>
              </div>
              <button onClick={() => setPortMenu(null)} className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-200 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto py-1 px-1.5 space-y-0.5">
              {questions
                .filter(q => q.id !== portMenu.sourceId)
                .map(q => (
                  <button
                    key={q.id}
                    onClick={() => applyJump(q.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-2 cursor-pointer ${
                      portMenu.currentTarget === q.id
                        ? 'bg-red-50 text-[#E4002B] border border-red-200'
                        : 'text-slate-700 hover:bg-red-50/50 hover:text-[#E4002B]'
                    }`}
                  >
                    <span className="w-5 h-5 bg-[#E4002B] text-white text-[9px] font-black rounded-md flex items-center justify-center shrink-0">
                      {q.order}
                    </span>
                    <span className="truncate flex-1">{q.title || 'Sin título'}</span>
                    {portMenu.currentTarget === q.id && <span className="text-[#E4002B] font-black">✓</span>}
                  </button>
                ))
              }
            </div>

            <div className="border-t border-slate-100 px-1.5 py-1.5 space-y-0.5">
              <button
                onClick={() => applyJump('')}
                className={`w-full text-left px-2.5 py-2 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-2 cursor-pointer ${
                  portMenu.currentTarget === ''
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                <Flag className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Finalizar encuesta aquí (FIN)</span>
                {portMenu.currentTarget === '' && <span className="text-emerald-600 font-black">✓</span>}
              </button>
              {portMenu.currentTarget !== undefined && portMenu.currentTarget !== '' && (
                <button
                  onClick={() => applyJump('__remove__')}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Eliminar conexión</span>
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
