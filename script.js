// 转换工具站核心功能

// ==================== 转换系数定义 ====================
const CONVERSION_RATES = {
    // 长度单位 (基准: 米)
    length: {
        m: 1,
        km: 1000,
        cm: 0.01,
        mm: 0.001,
        ft: 0.3048,
        in: 0.0254,
        yd: 0.9144,
        mile: 1609.344,
        nmi: 1852,
        '市尺': 0.33333
    },

    // 重量单位 (基准: 千克)
    weight: {
        kg: 1,
        g: 0.001,
        mg: 0.000001,
        lb: 0.453592,
        oz: 0.0283495,
        t: 1000,
        '斤': 0.5,
        '两': 0.05
    },

    // 面积单位 (基准: 平方米)
    area: {
        '㎡': 1,
        'km²': 1000000,
        'ha': 10000,
        acre: 4046.86,
        'ft²': 0.092903,
        'in²': 0.00064516,
        '亩': 666.667
    },

    // 体积单位 (基准: 升)
    volume: {
        l: 1,
        ml: 0.001,
        'm³': 1000,
        gal: 3.78541,
        qt: 0.946353,
        pt: 0.473176,
        cup: 0.236588
    },

    // 速度单位 (基准: 米/秒)
    speed: {
        'm/s': 1,
        'km/h': 0.277778,
        mph: 0.44704,
        knot: 0.514444,
        'ft/s': 0.3048
    },

    // 时间单位 (基准: 秒)
    time: {
        s: 1,
        min: 60,
        h: 3600,
        d: 86400,
        week: 604800,
        month: 2592000,
        year: 31536000
    }
};

// ==================== 温度特殊转换 ====================
function convertTemperature(value, from, to) {
    // 先转换到摄氏度
    let celsius;
    switch (from) {
        case 'c': celsius = value; break;
        case 'f': celsius = (value - 32) * 5/9; break;
        case 'k': celsius = value - 273.15; break;
        default: celsius = value;
    }

    // 从摄氏度转换到目标单位
    switch (to) {
        case 'c': return celsius;
        case 'f': return celsius * 9/5 + 32;
        case 'k': return celsius + 273.15;
        default: return celsius;
    }
}

// ==================== 货币汇率（模拟API） ====================
const CURRENCY_RATES = {
    USD: 1,
    CNY: 7.25,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 151.5,
    AUD: 1.52,
    CAD: 1.36,
    CHF: 0.89,
    HKD: 7.82,
    KRW: 1350
};

// ==================== 历史记录管理 ====================
class HistoryManager {
    constructor() {
        this.storageKey = 'convert_history';
        this.maxItems = 10;
    }

    getHistory() {
        const history = localStorage.getItem(this.storageKey);
        return history ? JSON.parse(history) : [];
    }

    addRecord(record) {
        const history = this.getHistory();
        history.unshift({
            ...record,
            timestamp: new Date().toLocaleString()
        });

        // 限制最大条数
        if (history.length > this.maxItems) {
            history.pop();
        }

        localStorage.setItem(this.storageKey, JSON.stringify(history));
        this.displayHistory();
    }

    clearHistory() {
        localStorage.removeItem(this.storageKey);
        this.displayHistory();
    }

    displayHistory() {
        const historyList = document.getElementById('history-list');
        const history = this.getHistory();

        if (history.length === 0) {
            historyList.innerHTML = '<div class="text-sm text-gray-500 text-center py-4">暂无转换记录</div>';
            return;
        }

        historyList.innerHTML = history.map(record => `
            <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <div>
                    <span class="font-medium">${record.fromValue} ${record.fromUnit}</span>
                    <i class="fas fa-arrow-right mx-2 text-xs text-gray-400"></i>
                    <span class="font-medium">${record.toValue} ${record.toUnit}</span>
                </div>
                <span class="text-xs text-gray-400">${record.timestamp}</span>
            </div>
        `).join('');
    }
}

// ==================== 转换器类 ====================
class UnitConverter {
    constructor() {
        this.historyManager = new HistoryManager();
        this.initEventListeners();
        this.initAllConverters();
        this.updateExchangeRates();
        this.historyManager.displayHistory();

        // 每5分钟更新一次汇率
        setInterval(() => this.updateExchangeRates(), 300000);
    }

    initEventListeners() {
        // 类别切换
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.category-btn').forEach(b => {
                    b.classList.remove('active', 'bg-blue-600', 'text-white');
                    b.classList.add('bg-gray-100', 'text-gray-700');
                });

                e.target.classList.add('active', 'bg-blue-600', 'text-white');
                e.target.classList.remove('bg-gray-100', 'text-gray-700');
            });
        });

        // 长度转换事件
        this.initLengthConverter();

        // 交换按钮
        document.getElementById('swap-length')?.addEventListener('click', () => {
            this.swapUnits('length');
        });

        // 清除历史
        document.getElementById('clear-history')?.addEventListener('click', () => {
            this.historyManager.clearHistory();
        });

        // 实时监听输入
        document.getElementById('length-input')?.addEventListener('input', () => {
            this.convertLength();
        });

        document.getElementById('length-from')?.addEventListener('change', () => {
            this.convertLength();
        });

        document.getElementById('length-to')?.addEventListener('change', () => {
            this.convertLength();
        });
    }

    initAllConverters() {
        // 初始化所有转换器
        this.convertLength();
    }

    // 长度转换
    convertLength() {
        const input = document.getElementById('length-input');
        const from = document.getElementById('length-from');
        const to = document.getElementById('length-to');
        const output = document.getElementById('length-output');

        if (!input || !from || !to || !output) return;

        const value = parseFloat(input.value) || 0;
        const fromUnit = from.value;
        const toUnit = to.value;

        // 转换到基准单位（米）
        const meters = value * CONVERSION_RATES.length[fromUnit];
        // 从基准单位转换到目标单位
        const result = meters / CONVERSION_RATES.length[toUnit];

        output.value = result.toFixed(4);

        // 添加到历史记录（非空值）
        if (value !== 0) {
            this.historyManager.addRecord({
                fromValue: value,
                fromUnit: from.options[from.selectedIndex].text.split(' ')[0],
                toValue: result.toFixed(4),
                toUnit: to.options[to.selectedIndex].text.split(' ')[0],
                type: '长度'
            });
        }
    }

    // 交换单位
    swapUnits(type) {
        const from = document.getElementById(`${type}-from`);
        const to = document.getElementById(`${type}-to`);

        if (from && to) {
            const temp = from.value;
            from.value = to.value;
            to.value = temp;

            this[`convert${type.charAt(0).toUpperCase() + type.slice(1)}`]();
        }
    }

    // 更新汇率（模拟API）
    async updateExchangeRates() {
        // 这里应该调用真实的汇率API，目前使用模拟数据
        const elements = {
            'usd-cny': '7.25',
            'eur-cny': '7.85',
            'gbp-cny': '9.12',
            'jpy-cny': '0.048'
        };

        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = value;
            }
        }

        const timeEl = document.getElementById('rate-update-time');
        if (timeEl) {
            const now = new Date();
            timeEl.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
        }
    }
}

// ==================== 初始化应用 ====================
document.addEventListener('DOMContentLoaded', () => {
    window.converter = new UnitConverter();
});
