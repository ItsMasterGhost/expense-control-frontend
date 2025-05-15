// src/pages/Reportes/GraficosComparativos.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Chart,
    Series,
    ArgumentAxis,
    ValueAxis,
    Legend,
    Tooltip,
    CommonSeriesSettings,
    Title,
    Subtitle,
    Export,
    LoadingIndicator,
    Label as ChartLabel
} from 'devextreme-react/chart';
import { DateBox, DateBoxTypes } from 'devextreme-react/date-box';
import { Button } from 'devextreme-react/button';
import api from '../../services/api'; 
import notify from 'devextreme/ui/notify';
import 'devextreme/dist/css/dx.light.css';
// import '../../styles/reportes/graficos.css'; 

interface ChartDataPoint {
    expenseType: string;    
    budgetedAmount: number; 
    actualAmount: number;  
}

const GraficosComparativos: React.FC = () => {
    const today = new Date();
    const firstDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const [startDate, setStartDate] = useState<Date>(firstDayOfPrevMonth);
    const [endDate, setEndDate] = useState<Date>(lastDayOfPrevMonth);
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [loading, setLoading] = useState(false);

    const chartRef = useRef<React.ComponentRef<typeof Chart> | null>(null);

    const loadChartData = useCallback(async () => {
        // ... (lógica de loadChartData como estaba)
        if (!startDate || !endDate) {
            notify('Por favor, seleccione un rango de fechas.', 'info'); return;
        }
        if (startDate > endDate) {
            notify('La fecha de inicio no puede ser posterior a la fecha de fin.', 'error'); return;
        }
        setLoading(true);
        try {
            const params = {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            };
            const response = await api.get<ChartDataPoint[]>('/Movements/budget-execution-chart', { params });
            setChartData(response.data);
            if (response.data.length === 0) {
                notify('No se encontraron datos para el rango de fechas seleccionado.', 'info', 3000);
            }
        } catch (error: any) {
            console.error('Error cargando datos del gráfico:', error);
            const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Error al cargar datos del gráfico';
            notify(errorMessage, 'error', 4000);
            setChartData([]); 
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        loadChartData(); 
    }, [loadChartData]);

    const handleStartDateChange = (e: DateBoxTypes.ValueChangedEvent) => { /* ... (como estaba) ... */ if (e.value) { if (e.value > endDate) { notify('La fecha "Desde" no puede ser mayor que la fecha "Hasta".', 'warning'); } else { setStartDate(e.value); } } };
    const handleEndDateChange = (e: DateBoxTypes.ValueChangedEvent) => { /* ... (como estaba) ... */ if (e.value) { if (e.value < startDate) { notify('La fecha "Hasta" no puede ser menor que la fecha "Desde".', 'warning'); } else { setEndDate(e.value); } } };
    const customizeTooltip = (arg: any) => { /* ... (como estaba) ... */ return { text: `${arg.seriesName || arg.point.argument}: ${arg.valueText}` }; };

    return (
        // Aplicar el estilo de centrado directamente al div más externo de la página
        <div 
            className="content-page graficos-comparativos-page" // Añadir una clase específica si necesitas más estilos
            style={{ 
                padding: '20px', 
                maxWidth: '1000px', // O el ancho que prefieras (ej. '80%', '1200px')
                margin: '0 auto'    // Esto centra el div horizontalmente
            }}
        >
            {/* Todo el contenido de la página va aquí dentro */}
            <h2 className="content-title" style={{ marginBottom: '20px', textAlign: 'center' }}>
                Gráfico Comparativo: Presupuesto vs. Ejecución
            </h2>
        
            <div className="filter-container" style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'flex-end', justifyContent: 'center' }}>
                <DateBox
                    label="Fecha Inicio"
                    value={startDate}
                    onValueChanged={handleStartDateChange}
                    type="date"
                    displayFormat="dd/MM/yyyy"
                    width={180}
                    stylingMode="filled"
                    max={endDate}
                    disabled={loading}
                />
                <DateBox
                    label="Fecha Fin"
                    value={endDate}
                    onValueChanged={handleEndDateChange}
                    type="date"
                    displayFormat="dd/MM/yyyy"
                    width={180}
                    stylingMode="filled"
                    min={startDate}
                    max={new Date()} 
                    disabled={loading}
                />
                <Button
                    text="Generar Gráfico"
                    onClick={loadChartData}
                    icon="refresh" 
                    type="default"
                    stylingMode="contained"
                    disabled={loading}
                    height={39.5} 
                />
            </div>

            <div className="chart-container" style={{ marginTop: '30px', height: '60vh', width: '100%' }}>
                {!loading && chartData.length === 0 && (
                    <div style={{textAlign: 'center', color: '#888', marginTop: '50px'}}>
                        No hay datos para mostrar con los filtros seleccionados o para el período actual.
                    </div>
                )}
                {(chartData.length > 0 || loading) && (
                    <Chart
                        ref={chartRef}
                        dataSource={chartData}
                        id="budgetExecutionChart"
                        palette="Material" 
                        rotated={false} 
                    >
                        <Title text="Comparativa de Presupuesto vs. Gasto Ejecutado">
                            <Subtitle text={`Del ${startDate.toLocaleDateString('es-ES')} al ${endDate.toLocaleDateString('es-ES')}`} />
                        </Title>
                        
                        <CommonSeriesSettings
                            argumentField="expenseType" 
                            type="bar" 
                            hoverMode="allArgumentPoints"
                            selectionMode="allArgumentPoints"
                            label={{ 
                                visible: true, 
                                format: { type: "currency", precision: 0 },
                                connector: { visible: true, width: 1 },
                                position: "outside"
                            }}
                        />
                        <Series valueField="budgetedAmount" name="Presupuestado" color="#5D9CEC" />
                        <Series valueField="actualAmount" name="Ejecutado" color="#FF6347" />
                        
                        <ArgumentAxis title="Tipo de Gasto" />
                        <ValueAxis title="Monto" position="left">
                            <ChartLabel format={{ type: "currency", precision: 0 }} /> 
                        </ValueAxis>
                        
                        <Legend verticalAlignment="bottom" horizontalAlignment="center" itemTextPosition="right" />
                        <Tooltip enabled={true} shared={false} customizeTooltip={customizeTooltip} format={{ type: "currency", precision: 2 }} />
                        <Export enabled={true} /> 
                        <LoadingIndicator show={loading} /> 
                    </Chart>
                )}
            </div>
        </div>
    );
};

export default GraficosComparativos;