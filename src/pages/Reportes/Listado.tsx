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

interface UserMovement {
    movementType: 'Deposit' | 'Expense';
    date: Date | string; 
    fund: string;
    amount: number; 
    expenseType?: string | null;
    commerce?: string | null;
    clientSideId?: number; 
}

const ListadoMovimientosPage: React.FC = () => {
    const [movementsDataSource, setMovementsDataSource] = useState<CustomStore<UserMovement, number> | null>(null);
    const [loading, setLoading] = useState(false);
    
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [fromDate, setFromDate] = useState<Date>(firstDayOfMonth);
    const [toDate, setToDate] = useState<Date>(today);

    const dataGridRef = useRef<DataGridRef<UserMovement, number> | null>(null); 

    useEffect(() => {
        // setLoading(true); // Se maneja dentro del load del CustomStore
        let clientSideIdCounter = 0;
        const store = new CustomStore<UserMovement, number>({ 
            key: "clientSideId", 
            load: async (loadOptions: LoadOptions) => {
                setLoading(true);
                try {
                    const params = {
                        startDate: fromDate.toISOString(), 
                        endDate: toDate.toISOString(),     
                    };
                    // Asegúrate que este endpoint es el correcto y que el backend lo espera así
                    const response = await api.get<Omit<UserMovement, 'clientSideId'>[]>('/Movements/movimientos-usuario', { params });
                    
                    const data = response.data.map(item => ({
                        ...item,
                        date: new Date(item.date), 
                        clientSideId: clientSideIdCounter++, 
                    }));
                    return { data: data, totalCount: data.length };
                } catch (error: any) {
                    console.error('Error al cargar movimientos:', error);
                    // Mostrar un error más específico si es posible
                    const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Error al cargar movimientos';
                    notify(errorMessage, 'error', 4000);
                    throw error; // Importante para que el DataGrid sepa que falló
                } finally {
                    setLoading(false);
                }
            },
        });
        setMovementsDataSource(store);
        
        // Si el DataGrid ya está montado y las fechas cambian, refresca.
        // Si es el montaje inicial, el dataSource nuevo disparará la carga.
        if (dataGridRef.current?.instance) { // Acceso seguro a la instancia
            dataGridRef.current.instance().refresh();
        }

    }, [fromDate, toDate]); // Dependencias: fromDate y toDate

    const handleFromDateChange = (e: DateBoxTypes.ValueChangedEvent) => {
        if (e.value) {
            if (e.value > toDate) {
                notify('La fecha "Desde" no puede ser mayor que la fecha "Hasta".', 'warning');
            } else {
                setFromDate(e.value);
            }
        }
    };

    const handleToDateChange = (e: DateBoxTypes.ValueChangedEvent) => {
        if (e.value) {
            if (e.value < fromDate) {
                notify('La fecha "Hasta" no puede ser menor que la fecha "Desde".', 'warning');
            } else {
                setToDate(e.value);
            }
        }
    };

    const onExporting = (e: any) => { 
        notify("Funcionalidad de exportación comentada. Instala 'file-saver' y 'exceljs' si la necesitas.", "info", 3000);
    };


    return (
        <div className="listado-container" style={{ padding: '20px' }}>
            <h2 className="page-title" style={{ marginBottom: '20px' }}>Historial de Movimientos</h2>
            <div className="filter-container" style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
                <DateBox
                    label="Desde"
                    value={fromDate}
                    onValueChanged={handleFromDateChange}
                    width={180}
                    type="date"
                    displayFormat="dd/MM/yyyy" // Formato de visualización
                    stylingMode="filled"
                    max={toDate}
                    disabled={loading}
                />
                <DateBox
                    label="Hasta"
                    value={toDate}
                    onValueChanged={handleToDateChange}
                    width={180}
                    type="date"
                    displayFormat="dd/MM/yyyy"
                    stylingMode="filled"
                    min={fromDate}
                    max={new Date()}
                    disabled={loading}
                />
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
                    <ToolbarItem 
                        widget="dxButton"
                        options={{ 
                            icon: 'refresh', 
                            hint: 'Recargar datos', 
                            onClick: () => dataGridRef.current?.instance()?.refresh(), 
                            disabled: loading 
                        }}
                        location="after"
                    />
                    <ToolbarItem name="exportButton" location="after" />
                    <ToolbarItem name="columnChooserButton" location="after" />
                </Toolbar>

                <Column dataField="movementType" caption="Tipo Mov." width={100} />
                <Column 
                    dataField="date" 
                    caption="Fecha" 
                    dataType="date" 
                    format="dd/MM/yyyy HH:mm" // Formato de DevExtreme para fecha y hora
                    width={160} 
                    sortOrder="desc" 
                />
                <Column dataField="fund" caption="Fondo" minWidth={150} />
                <Column 
                    dataField="amount" 
                    caption="Monto" 
                    dataType="number" 
                    format="currency" // DevExtreme aplicará el formato de moneda por defecto (o el configurado globalmente si lo hiciste)
                    width={120} 
                    alignment="right"
                    // cellRender para colores opcional, pero el formateo básico lo hace la columna:
                    cellRender={({ data, text }: { data: UserMovement, text: string }) => {
                        const color = data.movementType === 'Expense' ? '#d9534f' : '#5cb85c';
                        return <span style={{ color }}>{text}</span>; // 'text' ya tiene el valor formateado por `format="currency"`
                    }}
                />
                <Column dataField="expenseType" caption="Tipo de Gasto" minWidth={150}/>
                <Column dataField="commerce" caption="Comercio/Concepto" minWidth={200} />
                
                <Summary>
                    <TotalItem
                        column="amount" 
                        summaryType="sum" 
                        valueFormat="currency" 
                        displayFormat="Total: {0}" // DevExtreme usará el formato de moneda
                    />
                </Summary>
            </DataGrid>
        </div>
    );
};

export default ListadoMovimientosPage;