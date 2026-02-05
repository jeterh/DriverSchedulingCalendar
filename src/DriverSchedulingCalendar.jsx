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
    alert('儲存成功！');
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <style>{`
        /* 自定義捲軸 */
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        
        /* 強化列印樣式：補足外邊框 */
        @media print {
          @page { size: A4 landscape; margin: 1cm 0.6cm; }
          header, .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          main { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
          .print-title { display: block !important; text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 5px; color: black; }
          .print-legend { display: flex !important; justify-content: center; gap: 20px; font-size: 9pt; margin-bottom: 10px; color: #333; }
          .bg-white { border: none !important; box-shadow: none !important; }
          .overflow-x-auto { overflow: visible !important; }
          table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; font-size: 7.5pt !important; border: 1px solid #333 !important; box-sizing: border-box !important; }
          th, td { border: 0.5pt solid #666 !important; padding: 2px 0 !important; height: 22pt !important; text-align: center !important; }
          .col-name { width: 55pt !important; }
          .col-plate { width: 60pt !important; }
          .col-type { width: 45pt !important; }
          .col-stat { width: 30pt !important; }
          .sticky { position: static !important; background: transparent !important; box-shadow: none !important; }
          .text-red-500 { color: #cc0000 !important; }
          .text-blue-500 { color: #0000cc !important; }
          .bg-orange-50 { background-color: #fff9f5 !important; }
        }

        .print-title, .print-legend { display: none; }

        /* 介面寬度與鎖定控制 */
        .col-name { width: 80px; min-width: 80px; }
        .col-plate { width: 100px; min-width: 100px; }
        .col-type { width: 80px; min-width: 80px; }
        .col-stat { width: 60px; min-width: 60px; }
        .col-date { width: 40px; min-width: 40px; }

        /* 網頁版及手機版鎖定邏輯 */
        .sticky-header { position: sticky; top: 0; z-index: 45; }
        .sticky-left-1 { position: sticky; left: 0; z-index: 40; }
        .sticky-left-2 { position: sticky; left: 80px; z-index: 40; }

        @media (max-width: 639px) {
            /* 手機版：車型不再設 sticky，會隨頁面左移捲動 */
            .col-type-cell { position: static !important; }
        }
      `}</style>

      {/* 設定面板 */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSettings(false)}></div>
          <div className="relative w-[90%] max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
            <div className="p-4 border-b flex justify-between items-center bg-slate-800 text-white">
              <div className="flex items-center gap-2">
                <Users size={20} />
                <h2 className="text-lg font-bold">車隊成員管理</h2>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-700 rounded-full transition"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {drivers.map(d => (
                <div key={d.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50 relative group">
                  <button onClick={() => removeDriver(d.id)} className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 transition"><Trash2 size={16} /></button>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-400">司機姓名</label>
                      <input type="text" value={d.name} onChange={(e) => updateDriver(d.id, 'name', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400">車號</label>
                      <input type="text" value={d.carPlate} onChange={(e) => updateDriver(d.id, 'carPlate', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400">車型</label>
                      <input type="text" value={d.carType} onChange={(e) => updateDriver(d.id, 'carType', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white border-t border-slate-100">
              <button onClick={addDriver} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition"><UserPlus size={18} /> 新增人員</button>
            </div>
          </div>
        </div>
      )}

      {/* 導覽列 */}
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-xl no-print">
        <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-inner"><Truck className="text-white" size={24} /></div>
            <div>
              <h1 className="text-xl font-black">車隊排班系統</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Driver Scheduling</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700 px-4 py-2 rounded-xl font-bold transition text-sm active:scale-95"><Printer size={16}/>列印報表</button>
            <button onClick={autoSchedule} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl font-bold transition text-sm active:scale-95"><RefreshCw size={16} className={isAutoScheduling ? 'animate-spin' : ''}/>自動排班</button>
            <button onClick={save} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl font-bold transition text-sm text-white hover:text-blue-700 active:scale-95"><Save size={16}/>儲存資料</button>
            <button onClick={() => setShowSettings(true)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700"><Settings size={20}/></button>
          </div>
        </div>
      </header>

      {/* 列印專用標題 */}
      <div className="print-title">{year} 年 {month + 1} 月 車隊排班表</div>
      <div className="print-legend">
        <span>✕：休假</span>
        <span>◇：機動代班</span>
        <span>特：特休假</span>
      </div>

      <main className="p-4 sm:p-6 max-w-screen-2xl mx-auto">
        {/* 控制列：包含月份選擇與狀態說明 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 no-print">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 月份選擇 */}
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
              <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 hover:bg-slate-50 rounded-xl transition"><ChevronDown className="rotate-90 text-slate-400" size={20}/></button>
              <span className="text-lg font-black font-mono px-4">{year} / {String(month + 1).padStart(2, '0')}</span>
              <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 hover:bg-slate-50 rounded-xl transition"><ChevronDown className="-rotate-90 text-slate-400" size={20}/></button>
            </div>

            {/* 視覺化狀態說明 (Legend) - 補回位置 */}
            <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border border-slate-200 shadow-sm text-xs font-bold">
              <div className="flex items-center gap-1.5 border-r border-slate-100 pr-3">
                <span className="text-red-500 text-base">✕</span>
                <span className="text-slate-500">休假</span>
              </div>
              <div className="flex items-center gap-1.5 border-r border-slate-100 pr-3">
                <span className="text-blue-500 text-lg">◇</span>
                <span className="text-slate-500">機動</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-purple-500">特</span>
                <span className="text-slate-500">特休</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-2xl border border-blue-100 self-start md:self-center">
            <span className="text-xs font-bold uppercase mr-2 opacity-60">應休基準</span>
            <span className="text-xl font-black">{totalHolidaysInMonth} 天</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden print:overflow-visible">
          <div className="overflow-x-auto custom-scrollbar print:overflow-visible">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 sticky-header">
                  {/* 姓名 - 鎖定 */}
                  <th className="col-name p-3 sticky-left-1 bg-slate-50 z-30 border-r text-left font-black text-slate-400 text-[10px] uppercase tracking-wider shadow-[1px_0_0_0_#e2e8f0]">姓名</th>
                  
                  {/* 車號 - 鎖定 */}
                  <th className="col-plate p-3 sticky-left-2 bg-slate-50 z-30 border-r text-left font-black text-slate-400 text-[10px] uppercase tracking-wider shadow-[1px_0_0_0_#e2e8f0]">車號</th>
                  
                  {/* 車型 - 手機版不鎖定 */}
                  <th className="col-type p-3 bg-slate-50 border-r text-left font-black text-slate-400 text-[10px] uppercase tracking-wider col-type-cell">車型</th>

                  {calendarDays.map(d => (
                    <th key={d.date} className={`col-date p-1 border-r text-center ${d.isWeekend ? 'bg-orange-50/50' : ''}`}>
                      <div className="text-[8px] font-bold text-slate-300 mb-0.5">{WEEKDAYS[d.dayOfWeek]}</div>
                      <div className={`text-xs font-black ${d.isWeekend ? 'text-orange-600' : 'text-slate-700'}`}>{d.date}</div>
                    </th>
                  ))}
                  <th className="col-stat p-3 bg-slate-100 border-l font-black text-center text-slate-400 text-[10px]">排休</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.map(driver => {
                  let offCount = 0;
                  return (
                    <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* 姓名欄位 - 鎖定 */}
                      <td className="col-name p-3 font-bold sticky-left-1 bg-white z-20 border-r text-slate-700 whitespace-nowrap shadow-[1px_0_0_0_#f1f5f9]">
                        {driver.name.split('(')[0]}
                      </td>
                      
                      {/* 車號欄位 - 鎖定 */}
                      <td className="col-plate p-3 font-mono text-slate-400 sticky-left-2 bg-white z-20 border-r text-[10px] shadow-[1px_0_0_0_#f1f5f9]">
                        {driver.carPlate}
                      </td>

                      {/* 車型欄位 - 手機版不鎖定 */}
                      <td className="col-type p-3 text-slate-400 font-bold bg-white border-r text-[10px] col-type-cell">
                        {driver.carType}
                      </td>

                      {calendarDays.map(day => {
                        const s = schedule[`${driver.id}_${day.fullDate}`];
                        if (s === STATUS.OFF || s === STATUS.SPECIAL) offCount++;
                        return (
                          <td 
                            key={day.date} 
                            onClick={() => handleCellClick(driver.id, day.fullDate)}
                            className={`col-date p-0 border-r text-center cursor-pointer select-none h-10 sm:h-12 ${day.isWeekend ? 'bg-orange-50/5' : ''} hover:bg-blue-50/50`}
                          >
                            <div className="flex items-center justify-center w-full h-full">
                              {s === STATUS.OFF && <span className="text-red-500 font-black text-base">✕</span>}
                              {s === STATUS.MOBILE && <span className="text-blue-500 font-black text-lg">◇</span>}
                              {s === STATUS.SPECIAL && <span className="text-purple-600 font-black text-[12px]">特</span>}
                            </div>
                          </td>
                        );
                      })}
                      <td className={`col-stat p-3 text-center font-black bg-white border-l text-sm ${offCount < totalHolidaysInMonth ? 'text-red-500' : 'text-emerald-600'}`}>
                        {offCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}