import React, { useState, useMemo, useEffect } from 'react';
import { Truck, Users, Settings, Save, RefreshCw, Trash2, ChevronDown, Calendar, Printer, X, Plus, UserPlus } from 'lucide-react';

// --- 常數設定 ---
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const INITIAL_DRIVERS = [
  { id: 1, name: '約聘1(葉)', type: 'contract', carType: 'CROSS', carPlate: 'RAM-3075', defaultRole: 'fixed' },
  { id: 2, name: '約聘2(簡)', type: 'contract', carType: 'SIENTA', carPlate: 'RAM-3080', defaultRole: 'fixed' },
  { id: 3, name: '約聘3(鄭)', type: 'contract', carType: 'RAV4', carPlate: 'RAM-3501', defaultRole: 'fixed' },
  { id: 4, name: '約聘4(王)', type: 'contract', carType: 'RAV4', carPlate: 'RAM-3506', defaultRole: 'fixed' },
  { id: 5, name: '約聘5(王)', type: 'contract', carType: 'RAV4', carPlate: 'RAM-3507', defaultRole: 'fixed' },
  { id: 6, name: '約聘6(葉)', type: 'contract', carType: 'CROSS', carPlate: 'RAM-3510', defaultRole: 'fixed' },
  { id: 7, name: '約聘7(黃)', type: 'contract', carType: '現代9座', carPlate: 'RAM-3523', defaultRole: 'fixed' },
  { id: 8, name: '約聘8(王)', type: 'contract', carType: 'CROSS', carPlate: 'RAM-3553', defaultRole: 'fixed' },
  { id: 9, name: '約聘9(黃)', type: 'contract', carType: 'SIENTA', carPlate: 'RAM-3576', defaultRole: 'fixed' },
  { id: 10, name: '約聘10(范)', type: 'contract', carType: '現代9座', carPlate: 'RAM-3582', defaultRole: 'fixed' },
  { id: 11, name: '承攬1(裴)', type: 'contractor', carType: 'RAV4', carPlate: 'RAM-3520', defaultRole: 'fixed' },
  { id: 12, name: '承攬2(林)', type: 'contractor', carType: 'CROSS', carPlate: 'RAM-3571', defaultRole: 'fixed' },
  { id: 13, name: '承攬3(陳)', type: 'contractor', carType: 'CROSS', carPlate: 'RAM-3572', defaultRole: 'mobile' },
  { id: 14, name: '承攬4(高)', type: 'contractor', carType: 'CROSS', carPlate: 'RAM-3575', defaultRole: 'mobile' },
  { id: 15, name: '承攬5(謝)', type: 'contractor', carType: 'CROSS', carPlate: 'RAM-3573', defaultRole: 'mobile' },
];

const STATUS = { WORK: 'work', OFF: 'off', MOBILE: 'mobile', SPECIAL: 'special' };
const STORAGE_KEY = 'shift_scheduler_data_v1';

const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [schedule, setSchedule] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed.drivers) setDrivers(parsed.drivers);
      if (parsed.schedule) setSchedule(parsed.schedule);
    }
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date: i,
        dayOfWeek: date.getDay(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        fullDate: `${year}-${month + 1}-${i}`
      });
    }
    return days;
  }, [year, month, daysInMonth]);

  const totalHolidaysInMonth = calendarDays.filter(d => d.isWeekend).length;

  const handleCellClick = (driverId, fullDate) => {
    const key = `${driverId}_${fullDate}`;
    const current = schedule[key] || STATUS.WORK;
    let next = STATUS.OFF;
    if (current === STATUS.OFF) next = STATUS.MOBILE;
    else if (current === STATUS.MOBILE) next = STATUS.SPECIAL;
    else if (current === STATUS.SPECIAL) next = STATUS.WORK;

    setSchedule(prev => {
      const updated = { ...prev };
      if (next === STATUS.WORK) delete updated[key];
      else updated[key] = next;
      return updated;
    });
  };

  const autoSchedule = () => {
    setIsAutoScheduling(true);
    setTimeout(() => {
      const newSchedule = {}; 
      const driverState = drivers.map(d => ({
        id: d.id,
        type: d.type,
        defaultRole: d.defaultRole,
        consecutiveWork: 0,
        consecutiveMobile: 0,
        totalOff: 0
      }));

      calendarDays.forEach(day => {
        const targetOff = day.isWeekend ? 8 : 3;
        const targetMobile = day.isWeekend ? 0 : 1;
        const mustRestIds = driverState.filter(d => d.consecutiveWork >= 6).map(d => d.id);
        const cannotRestIds = driverState.filter(d => d.type === 'contractor' && !day.isWeekend).map(d => d.id);
        let selectedOff = [...mustRestIds];
        let candidates = driverState.filter(d => !mustRestIds.includes(d.id) && !cannotRestIds.includes(d.id));
        candidates = shuffleArray(candidates);
        candidates.sort((a, b) => a.totalOff - b.totalOff);
        const needed = targetOff - selectedOff.length;
        if (needed > 0) selectedOff = [...selectedOff, ...candidates.slice(0, Math.max(0, needed)).map(d => d.id)];

        selectedOff.forEach(id => {
          newSchedule[`${id}_${day.fullDate}`] = STATUS.OFF;
          const d = driverState.find(x => x.id === id);
          d.consecutiveWork = 0; d.consecutiveMobile = 0; d.totalOff++;
        });

        const working = driverState.filter(d => !selectedOff.includes(d.id));
        let selectedMobileId = null;
        if (targetMobile > 0) {
          let mobileCandidates = working.filter(d => d.consecutiveMobile < 5);
          mobileCandidates = shuffleArray(mobileCandidates);
          mobileCandidates.sort((a, b) => {
             const aWeight = a.defaultRole === 'mobile' ? 0 : 1;
             const bWeight = b.defaultRole === 'mobile' ? 0 : 1;
             return aWeight !== bWeight ? aWeight - bWeight : a.consecutiveMobile - b.consecutiveMobile;
          });
          if (mobileCandidates.length > 0) selectedMobileId = mobileCandidates[0].id;
        }
        working.forEach(d => {
          if (d.id === selectedMobileId) { newSchedule[`${d.id}_${day.fullDate}`] = STATUS.MOBILE; d.consecutiveMobile++; }
          else d.consecutiveMobile = 0;
          d.consecutiveWork++;
        });
      });
      setSchedule(newSchedule);
      setIsAutoScheduling(false);
    }, 400);
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ drivers, schedule }));
    alert('儲存成功！資料已儲存在您的瀏覽器中。');
  };

  const addDriver = () => {
    const newId = Math.max(...drivers.map(d => d.id), 0) + 1;
    setDrivers([...drivers, { id: newId, name: `新人員 ${newId}`, type: 'contract', carType: 'CROSS', carPlate: 'NEW-0000', defaultRole: 'fixed' }]);
  };

  const updateDriver = (id, field, value) => setDrivers(drivers.map(d => d.id === id ? { ...d, [field]: value } : d));

  const removeDriver = (id) => {
    if (confirm('確定要刪除這位人員嗎？')) {
      setDrivers(drivers.filter(d => d.id !== id));
      const newSchedule = { ...schedule };
      Object.keys(newSchedule).forEach(k => { if (k.startsWith(`${id}_`)) delete newSchedule[k]; });
      setSchedule(newSchedule);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      <style>{`
        /* 自定義捲軸 */
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        
        /* 列印與響應式隱藏 */
        @media print {
          header, .no-print { display: none !important; }
          body { background: white; }
          .max-w-screen-2xl { max-width: 100% !important; margin: 0 !important; }
          table { font-size: 8pt !important; border: 1px solid #000; }
          .sticky { position: static !important; }
          .show-on-print { display: table-cell !important; }
        }

        /* 針對 iPad / Tablet 的特殊微調 */
        @media (min-width: 768px) and (max-width: 1024px) {
          .tablet-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }

        /* 針對 iPhone / Samsung S系列 (Mobile) */
        @media (max-width: 640px) {
          .mobile-hide { display: none !important; }
          .mobile-sticky-left { position: sticky; left: 0; z-index: 20; background: white; }
          .mobile-compact-table th, .mobile-compact-table td { padding: 8px 4px !important; }
        }
      `}</style>

      {/* 設定面板 */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowSettings(false)}></div>
          <div className="relative w-[90%] max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
            <div className="p-4 border-b flex justify-between items-center bg-slate-800 text-white shrink-0">
              <div className="flex items-center gap-2">
                <Users size={20} />
                <h2 className="text-lg font-bold">車隊成員管理</h2>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-700 rounded-full transition active:scale-90"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {drivers.map(d => (
                <div key={d.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50 relative group transition hover:border-blue-300">
                  <button onClick={() => removeDriver(d.id)} className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="text-[10px] font-bold text-slate-400">司機姓名</label>
                    <input type="text" value={d.name} onChange={(e) => updateDriver(d.id, 'name', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400">車型</label>
                    <input type="text" value={d.carType} onChange={(e) => updateDriver(d.id, 'carType', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400">車號</label>
                    <input type="text" value={d.carPlate} onChange={(e) => updateDriver(d.id, 'carPlate', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <button onClick={addDriver} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition shadow-lg active:scale-95"><UserPlus size={18} /> 新增人員</button>
            </div>
          </div>
        </div>
      )}

      {/* 導覽列 */}
      <header className="bg-slate-900 text-white p-3 sm:p-4 sticky top-0 z-40 shadow-xl no-print">
        <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="bg-blue-600 p-2 rounded-xl shadow-inner"><Truck className="text-white" size={24} /></div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tighter">車隊排班管理系統</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Driver Scheduling Calendar</p>
            </div>
          </div>
          <div className="flex w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 gap-2 scrollbar-hide">
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700 px-3 py-2 rounded-xl font-bold transition text-xs whitespace-nowrap active:scale-95"><Printer size={16}/>列印</button>
            <button onClick={autoSchedule} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-3 py-2 rounded-xl font-bold transition text-xs whitespace-nowrap active:scale-95 shadow-lg shadow-emerald-900/20"><RefreshCw size={16} className={isAutoScheduling ? 'animate-spin' : ''}/>一鍵排班</button>
            <button onClick={save} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-xl font-bold transition text-xs whitespace-nowrap active:scale-95 shadow-lg shadow-blue-900/20"><Save size={16}/>儲存</button>
            <button onClick={() => setShowSettings(true)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700 active:scale-90"><Settings size={20}/></button>
          </div>
        </div>
      </header>

      <main className="p-3 sm:p-6 max-w-screen-2xl mx-auto">
        {/* 月份切換 */}
        <div className="flex items-center justify-between mb-6 no-print">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
            <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 hover:bg-slate-50 rounded-xl transition active:scale-90"><ChevronDown className="rotate-90 text-slate-400" size={20}/></button>
            <span className="text-lg font-black font-mono px-4 text-slate-800">{year} / {String(month + 1).padStart(2, '0')}</span>
            <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 hover:bg-slate-50 rounded-xl transition active:scale-90"><ChevronDown className="-rotate-90 text-slate-400" size={20}/></button>
          </div>
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-2xl border border-blue-100 hidden sm:block">
            <span className="text-xs font-bold uppercase mr-2 opacity-60">應休天數</span>
            <span className="text-xl font-black">{totalHolidaysInMonth}</span>
          </div>
        </div>

        {/* 圖例 */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-6 text-xs font-bold text-slate-500 bg-slate-200/40 p-3 rounded-2xl no-print">
           <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-200"><span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span> ✕ 休假</div>
           <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-200"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span> ◇ 機動</div>
           <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-200"><span className="w-2.5 h-2.5 bg-purple-500 rounded-full"></span> 特 特休</div>
        </div>

        {/* 主要表格區域 */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative">
          <div className="overflow-x-auto custom-scrollbar tablet-scroll">
            <table className="w-full border-collapse mobile-compact-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3 sm:p-4 sticky left-0 bg-slate-50 z-30 border-r w-16 sm:w-24 text-left font-black text-slate-400 text-[10px] uppercase tracking-widest shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)]">姓名</th>
                  <th className="p-3 sm:p-4 sticky left-16 sm:left-24 bg-slate-50 z-30 border-r w-16 sm:w-28 text-left font-black text-slate-400 text-[10px] uppercase tracking-widest shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)]">車型</th>
                  <th className="p-3 sm:p-4 sticky left-32 sm:left-52 bg-slate-50 z-30 border-r w-24 sm:w-32 text-left font-black text-slate-400 text-[10px] uppercase tracking-widest shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)] mobile-hide show-on-print">車號</th>
                  
                  {calendarDays.map(d => (
                    <th key={d.date} className={`p-2 border-r min-w-[40px] sm:min-w-[50px] text-center ${d.isWeekend ? 'bg-orange-50/50' : ''}`}>
                      <div className="text-[9px] font-black text-slate-300 uppercase mb-1 mobile-hide">{WEEKDAYS[d.dayOfWeek]}</div>
                      <div className={`text-sm sm:text-base font-black ${d.isWeekend ? 'text-orange-600' : 'text-slate-700'}`}>{d.date}</div>
                    </th>
                  ))}
                  <th className="p-3 sm:p-4 bg-slate-100 w-12 sm:w-16 sticky right-0 z-30 border-l font-black text-center text-slate-400 text-[10px] shadow-[-4px_0_10px_-5px_rgba(0,0,0,0.1)]">排休</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.map(driver => {
                  let offCount = 0;
                  return (
                    <tr key={driver.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 sm:p-4 font-bold sticky left-0 bg-white group-hover:bg-slate-50 z-20 border-r shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)] text-slate-700 whitespace-nowrap truncate max-w-[64px] sm:max-w-none">
                        {driver.name.split('(')[0]}
                      </td>
                      <td className="p-3 sm:p-4 text-slate-400 font-bold sticky left-16 sm:left-24 bg-white group-hover:bg-slate-50 z-20 border-r shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)] text-[10px] sm:text-xs">
                        {driver.carType}
                      </td>
                      <td className="p-3 sm:p-4 font-mono text-slate-300 sticky left-32 sm:left-52 bg-white group-hover:bg-slate-50 z-20 border-r shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)] mobile-hide show-on-print text-[10px] sm:text-xs">
                        {driver.carPlate}
                      </td>
                      {calendarDays.map(day => {
                        const s = schedule[`${driver.id}_${day.fullDate}`];
                        if (s === STATUS.OFF || s === STATUS.SPECIAL) offCount++;
                        return (
                          <td 
                            key={day.date} 
                            onClick={() => handleCellClick(driver.id, day.fullDate)}
                            className={`p-0 border-r text-center cursor-pointer select-none relative h-10 sm:h-14 transition-all
                              ${day.isWeekend ? 'bg-orange-50/10' : ''}
                              hover:bg-blue-50 hover:z-10
                            `}
                          >
                            <div className="flex items-center justify-center w-full h-full">
                              {s === STATUS.OFF && <span className="text-red-500 font-black text-lg sm:text-xl drop-shadow-sm">✕</span>}
                              {s === STATUS.MOBILE && <span className="text-blue-500 font-black text-xl sm:text-2xl">◇</span>}
                              {s === STATUS.SPECIAL && <span className="bg-purple-500 text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded-md font-bold shadow-sm">特</span>}
                            </div>
                          </td>
                        );
                      })}
                      <td className={`p-3 sm:p-4 text-center font-black sticky right-0 z-20 shadow-[-4px_0_10px_-5px_rgba(0,0,0,0.1)] text-sm sm:text-base
                        ${offCount < totalHolidaysInMonth ? 'text-red-500 bg-red-50/50' : 'text-emerald-600 bg-emerald-50/50'}`}>
                        {offCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 底部提示 (Mobile Only) */}
        <div className="mt-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest sm:hidden">
          ← 左右滑動查看日期內容 →
        </div>
      </main>
    </div>
  );
}