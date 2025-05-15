import React, { useState, useEffect, useRef, useCallback } from 'react';
import DataGrid, {
    Column,
    Editing,
    Paging,
    Toolbar,
    Item as ToolbarItem,
    Scrolling,
    LoadPanel,
    Lookup,
    RequiredRule,
    DataGridRef 
    // No necesitamos ColumnEditCellTemplateData ni ColumnEditorOptions aquí
} from 'devextreme-react/data-grid';
import { SelectBox, SelectBoxTypes } from 'devextreme-react/select-box';
import CustomStore from 'devextreme/data/custom_store';
import { LoadOptions } from 'devextreme/data/load_options'; 
import api from '../../services/api';
import notify from 'devextreme/ui/notify';
import 'devextreme/dist/css/dx.light.css';
import { SavingEvent, InitNewRowEvent, EditorPreparingEvent } from 'devextreme/ui/data_grid'; // Añadir EditorPreparingEvent

// --- Interfaces ---
interface ExpenseType { id: number; name: string; }
interface BudgetView { 
    id?: number; // El ID que viene del backend para filas existentes
    expenseTypeId: number | null; 
    month: number; 
    year: number; 
    amount: number; 
}
interface BudgetSubmitDto { ExpenseTypeId: number; Month: number; Year: number; Amount: number; }

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: new Date(2000, i, 1).toLocaleString('es', { month: 'long' })
}));

const getYears = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i); 
};

const PresupuestosPage: React.FC = () => {
    const [budgetsDataSource, setBudgetsDataSource] = useState<CustomStore<BudgetView, number> | null>(null);
    const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);

    const dataGridRef = useRef<DataGridRef<BudgetView, number> | null>(null);

    useEffect(() => {
        const loadExpenseTypes = async () => { /* ... (como antes) ... */ try { const response = await api.get < ExpenseType[] > ('/ExpenseTypes'); setExpenseTypes(response.data); } catch (error) { console.error('Error al cargar tipos de gasto:', error); notify('Error al cargar tipos de gasto', 'error', 3000); }};
        loadExpenseTypes();
    }, []);

    useEffect(() => {
        setLoading(true); 
        const store = new CustomStore<BudgetView, number>({
            key: "expenseTypeId", 
            load: async (loadOptions: LoadOptions) => { /* ... (como antes) ... */ try { const response = await api.get < BudgetView[] > ('/Budgets'); const userBudgets = response.data; const filteredBudgets = userBudgets.filter( (b: BudgetView) => b.month === selectedMonth && b.year === selectedYear ); return { data: filteredBudgets, totalCount: filteredBudgets.length }; } catch (error) { console.error(`Error al cargar presupuestos para ${selectedMonth}/${selectedYear}:`, error); notify('Error al cargar presupuestos', 'error', 3000); throw error; } finally { setLoading(false); }},
            insert: async (values: BudgetView) => { /* ... (como antes) ... */ setLoading(true); const payload: BudgetSubmitDto = { ExpenseTypeId: values.expenseTypeId!, Month: selectedMonth, Year: selectedYear, Amount: values.amount }; try { await api.post('/Budgets', payload); notify('Presupuesto guardado', 'success', 2000); return values; } catch (error: any) { notify(error.response?.data?.message || 'Error al guardar presupuesto', 'error', 3000); throw error; } finally { setLoading(false); }},
            update: async (key: number, values: Partial<BudgetView>) => { /* ... (como antes) ... */ setLoading(true); const amountToUpdate = values.amount; if (amountToUpdate === undefined) { notify('No se especificó un monto para actualizar.', 'warn'); throw new Error('Monto no especificado'); } const payload: BudgetSubmitDto = { ExpenseTypeId: key, Month: selectedMonth, Year: selectedYear, Amount: amountToUpdate }; try { await api.post('/Budgets', payload); notify('Presupuesto actualizado', 'success', 2000); return values; } catch (error: any) { notify(error.response?.data?.message || 'Error al actualizar presupuesto', 'error', 3000); throw error; } finally { setLoading(false); }},
        });
        setBudgetsDataSource(store);
        
        if (dataGridRef.current && typeof dataGridRef.current.instance === 'function') {
             const gridInstance = dataGridRef.current.instance();
             if (gridInstance && typeof gridInstance.refresh === 'function') {
                 gridInstance.refresh();
             }
        }
    }, [selectedMonth, selectedYear]); 

    const handleMonthChange = useCallback((e: SelectBoxTypes.ValueChangedEvent) => {
        if (e.value !== null && e.value !== undefined) {
           setSelectedMonth(e.value as number);
        }
    }, []);

    const handleYearChange = useCallback((e: SelectBoxTypes.ValueChangedEvent) => {
         if (e.value !== null && e.value !== undefined) {
            setSelectedYear(e.value as number);
         }
    }, []);

    const onInitNewRowGrid = (e: InitNewRowEvent<BudgetView>) => {
        e.data.month = selectedMonth;
        e.data.year = selectedYear;
        e.data.amount = 0; 
        e.data.expenseTypeId = null; 
        // e.data.id es undefined, lo que usaremos para la lógica de edición condicional
    };

    const onSavingGrid = async (e: SavingEvent<BudgetView, number>) => { /* ... (como antes) ... */ 
        if (e.changes && e.changes.length > 0) {
            const changeData = e.changes[0].data as Partial<BudgetView>; 
            const isNewRow = e.changes[0].type === 'insert';
            if (isNewRow && (changeData.expenseTypeId === null || changeData.expenseTypeId === undefined)) {
                notify('Debe seleccionar un Tipo de Gasto.', 'error'); e.cancel = true; return;
            }
            if (isNewRow && dataGridRef.current && typeof dataGridRef.current.instance === 'function') {
                const gridInstance = dataGridRef.current.instance();
                if (gridInstance) {
                    const existingItems = gridInstance.getDataSource().items();
                    const duplicate = existingItems.find(item => item.expenseTypeId === changeData.expenseTypeId);
                    if (duplicate) {
                        notify('Este tipo de gasto ya tiene un presupuesto para el mes y año seleccionados.', 'warning');
                        e.cancel = true; return;
                    }
                }
            }
            if (changeData.amount === undefined || changeData.amount < 0) {
                notify('El monto presupuestado debe ser un número positivo o cero.', 'error'); e.cancel = true; return;
            }
            if (isNewRow) {
                (e.changes[0].data as BudgetView).month = selectedMonth;
                (e.changes[0].data as BudgetView).year = selectedYear;
            }
        }
    };

    // SOLUCIÓN Error 2: Usar onEditorPreparing para edición condicional
    const onEditorPreparingGrid = (e: EditorPreparingEvent<BudgetView, any>) => {
        // Deshabilitar la edición de 'expenseTypeId' para filas existentes (que tienen un 'id')
        if (e.parentType === 'dataRow' && e.dataField === 'expenseTypeId') {
            // e.row.data contiene los datos de la fila actual
            if (e.row && e.row.data && e.row.data.id !== undefined) {
                e.editorOptions.disabled = true;
            }
        }
        // Configurar editor de monto si es necesario (aunque dataType="number" y format="currency" deberían bastar)
        if (e.parentType === 'dataRow' && e.dataField === 'amount') {
            e.editorName = 'dxNumberBox'; // Asegurar que es numberbox
            e.editorOptions.format = 'currency';
            e.editorOptions.showSpinButtons = true;
            // e.editorOptions.min = 0; // Si quieres validar mínimo aquí
        }
    };

    return (
        <div className="content-page" style={{ padding: '20px' }}>
            <h2 className="content-title" style={{ marginBottom: '20px' }}>Configuración de Presupuestos</h2>
            <div className="filter-section" style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
                <span style={{fontWeight: 'bold'}}>Seleccione Periodo:</span>
                <SelectBox dataSource={MONTHS} value={selectedMonth} onValueChanged={handleMonthChange} displayExpr="name" valueExpr="id" width={200} stylingMode="filled" searchEnabled={true} disabled={loading} />
                <SelectBox dataSource={getYears()} value={selectedYear} onValueChanged={handleYearChange} width={120} stylingMode="filled" disabled={loading} />
            </div>
            
            <DataGrid
                ref={dataGridRef}
                dataSource={budgetsDataSource}
                keyExpr="expenseTypeId" 
                showBorders={true}
                columnAutoWidth={true}
                hoverStateEnabled={true}
                onInitNewRow={onInitNewRowGrid}
                onSaving={onSavingGrid}
                onEditorPreparing={onEditorPreparingGrid} // Añadir este manejador
                disabled={loading}
            >
                <LoadPanel enabled={loading} />
                <Paging defaultPageSize={10} enabled={true} /> 
                <Scrolling mode="standard" /> 
                <Toolbar>
                    <ToolbarItem name="addRowButton" showText="always" location="after" options={{ text: 'Agregar Presupuesto', disabled: loading }} />
                    <ToolbarItem widget="dxButton" options={{ icon: 'refresh', hint: 'Recargar datos', onClick: () => {
                        const gridInst = dataGridRef.current?.instance();
                        if (gridInst) gridInst.refresh();
                    }, disabled: loading }} location="after" />
                </Toolbar>
                <Editing mode="row" allowAdding={true} allowUpdating={true} allowDeleting={false} useIcons={true} />
                <Column 
                    dataField="expenseTypeId" 
                    caption="Tipo de Gasto"
                    // allowEditing ya no se define como función aquí
                >
                    <Lookup dataSource={expenseTypes} valueExpr="id" displayExpr="name" />
                    <RequiredRule message="El tipo de gasto es requerido." />
                </Column>
                <Column dataField="amount" caption="Monto Presupuestado" dataType="number" format="currency" >
                     <RequiredRule message="El monto es requerido." />
                </Column>
            </DataGrid>
        </div>
    );
};

export default PresupuestosPage;