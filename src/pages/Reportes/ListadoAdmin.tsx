import React, { useState, useEffect, useRef, useCallback } from 'react';
import DataGrid, {
    Column,
    FilterRow,
    SearchPanel,
    Toolbar,
    Item as ToolbarItem,
    Scrolling,
    LoadPanel,
    Summary,
    TotalItem,
    Export,
    ColumnChooser,
    DataGridRef,
    Paging,
    HeaderFilter
} from 'devextreme-react/data-grid';
import { DateBox, DateBoxTypes } from 'devextreme-react/date-box';
import CustomStore from 'devextreme/data/custom_store';
import { LoadOptions } from 'devextreme/data/load_options';
import api from '../../services/api'; 
import notify from 'devextreme/ui/notify';
import 'devextreme/dist/css/dx.light.css';


interface MovementView { 
    user: string; 
    movementType: 'Deposit' | 'Expense';
    date: Date | string; 
    fund: string;
    amount: number; 
    expenseType?: string | null;
    commerce?: string | null;
    clientSideId?: number; 
}

const ListadoMovimientosAdminPage: React.FC = () => {
    const [movementsDataSource, setMovementsDataSource] = useState<CustomStore<MovementView, number> | null>(null);
    const [loading, setLoading] = useState(false);
    
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [fromDate, setFromDate] = useState<Date>(firstDayOfMonth);
    const [toDate, setToDate] = useState<Date>(today);

    const dataGridRef = useRef<DataGridRef<MovementView, number> | null>(null); 

    useEffect(() => {
        let clientSideIdCounter = 0;
        const store = new CustomStore<MovementView, number>({ 
            key: "clientSideId", 
            load: async (loadOptions: LoadOptions) => {
                setLoading(true);
                try {
                    const params = {
                        startDate: fromDate.toISOString(), 
                        endDate: toDate.toISOString(),     
                    };
                    const response = await api.get<Omit<MovementView, 'clientSideId'>[]>('/Movements/movimientos-todos', { params });
                    
                    const data = response.data.map(item => ({
                        ...item, 
                        date: new Date(item.date), 
                        clientSideId: clientSideIdCounter++, 
                    }));
                    console.log("TODOS los movimientos cargados (Admin):", data); 
                    return { data: data, totalCount: data.length };
                } catch (error: any) {
                    console.error('Error al cargar todos los movimientos (Admin):', error);
                    const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Error al cargar todos los movimientos';
                    notify(errorMessage, 'error', 4000);
                    throw error; 
                } finally {
                    setLoading(false);
                }
            },
        });
        setMovementsDataSource(store);
        
        if (dataGridRef.current?.instance) {
            dataGridRef.current.instance().refresh();
        }

    }, [fromDate, toDate]);

    const handleFromDateChange = (e: DateBoxTypes.ValueChangedEvent) => { if (e.value) { if (e.value > toDate) { notify('La fecha "Desde" no puede ser mayor que la fecha "Hasta".', 'warning'); } else { setFromDate(e.value); } } };
    const handleToDateChange = (e: DateBoxTypes.ValueChangedEvent) => { if (e.value) { if (e.value < fromDate) { notify('La fecha "Hasta" no puede ser menor que la fecha "Desde".', 'warning'); } else { setToDate(e.value); } } };
    const onExporting = (e: any) => {notify("Funcionalidad de exportación comentada.", "info", 3000); e.cancel = true; };

    return (
        <div className="listado-container" style={{ padding: '20px' }}>
            <h2 className="page-title" style={{ marginBottom: '20px' }}>Consulta General de Movimientos (Admin)</h2>
            <div className="filter-container" style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
                <DateBox label="Desde" value={fromDate} onValueChanged={handleFromDateChange} width={180} type="date" displayFormat="dd/MM/yyyy" stylingMode="filled" max={toDate} disabled={loading} />
                <DateBox label="Hasta" value={toDate} onValueChanged={handleToDateChange} width={180} type="date" displayFormat="dd/MM/yyyy" stylingMode="filled" min={fromDate} max={new Date()} disabled={loading} />
            </div>
            
            <DataGrid
                ref={dataGridRef}
                dataSource={movementsDataSource}
                keyExpr="clientSideId"
                showBorders={true}
                columnAutoWidth={true}
                hoverStateEnabled={true}
                allowColumnReordering={true}
                allowColumnResizing={true}
                height="calc(100vh - 220px)"
                onExporting={onExporting}
                wordWrapEnabled={true}
                remoteOperations={false}
                noDataText={loading? "Cargando..." : "No hay movimientos para el rango de fechas seleccionado."}
            >
                <LoadPanel enabled={loading} />
                <Scrolling mode="virtual" /> 
                <Paging defaultPageSize={25} /> 
                <FilterRow visible={true} />
                <HeaderFilter visible={true} /> 
                <SearchPanel visible={true} width={250} placeholder="Buscar..." />
                <ColumnChooser enabled={true} />
                <Export enabled={true} allowExportSelectedData={false} />

                <Toolbar>
                    <ToolbarItem name="searchPanel" location="before" />
                    <ToolbarItem widget="dxButton" options={{ icon: 'refresh', hint: 'Recargar datos', onClick: () => dataGridRef.current?.instance()?.refresh(), disabled: loading }} location="after" />
                    <ToolbarItem name="exportButton" location="after" />
                    <ToolbarItem name="columnChooserButton" location="after" />
                </Toolbar>

                <Column dataField="user" caption="Usuario" minWidth={180} />

                <Column dataField="movementType" caption="Tipo Mov." width={100} />
                <Column dataField="date" caption="Fecha" dataType="date" format="dd/MM/yyyy HH:mm" width={160} sortOrder="desc" />
                <Column dataField="fund" caption="Fondo" minWidth={150} />
                <Column 
                    dataField="amount" 
                    caption="Monto" 
                    dataType="number" 
                    format="currency" 
                    width={120} 
                    alignment="right"
                    cellRender={({ data, text }: { data: MovementView, text: string }) => {
                        const color = data.movementType === 'Expense' ? '#d9534f' : '#5cb85c';
                        return <span style={{ color }}>{text}</span>; 
                    }}
                />
                <Column dataField="expenseType" caption="Tipo de Gasto" minWidth={150}/>
                <Column dataField="commerce" caption="Comercio/Concepto" minWidth={200} />
                
                <Summary>
                    <TotalItem column="amount" summaryType="sum" valueFormat="currency" displayFormat="Total General: {0}" />
                </Summary>
            </DataGrid>
        </div>
    );
};

export default ListadoMovimientosAdminPage;