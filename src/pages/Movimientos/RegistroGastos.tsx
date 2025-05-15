import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from 'devextreme-react/button';
import {
    Form, 
    SimpleItem,
    GroupItem,
    Label,
    RequiredRule,
    PatternRule,
    ButtonItem as FormButtonItem
} from 'devextreme-react/form';
import {
    DataGrid, // Componente React
    Column,
    Editing,
    Paging,
    Toolbar,
    Item as ToolbarItem,
    Lookup,
    LoadPanel,
    DataGridRef // Importar DataGridRef
} from 'devextreme-react/data-grid'; 
import dxForm from 'devextreme/ui/form'; 
import dxDataGrid, { 
    SavingEvent, 
    SavedEvent,
    RowInsertingEvent,
    EditorPreparingEvent
} from 'devextreme/ui/data_grid';
import api from '../../services/api';
import notify from 'devextreme/ui/notify';

// --- Interfaces (sin cambios) ---
interface Fund { id: number; name: string; }
interface ExpenseType { id: number; code: string; name: string; }
interface ExpenseDetailView extends ExpenseDetailSubmit { tempId: number; } // tempId es number
interface ExpenseDetailSubmit { expenseTypeId: number | null; amount: number; }
interface ExpenseHeaderFormData { date: Date; fundId: number | null; notes: string; businessName: string; documentType: string; }
interface ExpenseHeaderSubmitDto extends ExpenseHeaderFormData { details: ExpenseDetailSubmit[]; }
interface BudgetOverflowDto { expenseTypeId: number; budgetAmount: number; currentExpenses: number; newExpense: number; overflowAmount: number; expenseTypeName?: string; }

const DOCUMENT_TYPES = ['Factura', 'Comprobante', 'Otro'];

const RegistroGastosPage: React.FC = () => {
    const [funds, setFunds] = useState<Fund[]>([]);
    const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
    const [headerFormData, setHeaderFormData] = useState<ExpenseHeaderFormData>({
        date: new Date(), fundId: null, notes: '', businessName: '', documentType: 'Factura',
    });
    const [detailsData, setDetailsData] = useState<ExpenseDetailView[]>([]);
    const [loading, setLoading] = useState(false);
    const [isDataGridLoading, setIsDataGridLoading] = useState(false);

    const headerFormComponentRef = useRef<React.ComponentRef<typeof Form> | null>(null);
    // SOLUCIÓN: Usar DataGridRef<TData, TKey> para la declaración de la ref
    const detailsGridComponentRef = useRef<DataGridRef<ExpenseDetailView, number> | null>(null);


    const loadInitialData = useCallback(async () => { /* ... */ setLoading(true); try { const [fundsResponse, expenseTypesResponse] = await Promise.all([ api.get < Fund[] > ('/Funds'), api.get < ExpenseType[] > ('/ExpenseTypes')]); setFunds(fundsResponse.data); setExpenseTypes(expenseTypesResponse.data); } catch (error) { console.error("Error al cargar datos iniciales:", error); notify('Error al cargar los datos iniciales', 'error', 5000); } finally { setLoading(false); } }, []);
    useEffect(() => { loadInitialData(); }, [loadInitialData]);
    const handleHeaderFieldChange = useCallback((field: keyof ExpenseHeaderFormData, value: any) => { setHeaderFormData(prev => ({ ...prev, [field]: value })); }, []);

    const onRowInsertingDetails = (e: RowInsertingEvent<ExpenseDetailView>) => {
        e.data.tempId = Date.now();
        if (e.data.amount === undefined) e.data.amount = 0;
        if (e.data.expenseTypeId === undefined) e.data.expenseTypeId = null;
    };
    
    const onEditorPreparingDetails = (e: EditorPreparingEvent<ExpenseDetailView, any>) => {
        if (e.parentType === 'dataRow' && e.dataField === 'amount') {
            e.editorName = "dxNumberBox";
            e.editorOptions.min = 0.01;
            e.editorOptions.step = 0.01;
            e.editorOptions.format = 'currency';
            e.editorOptions.showSpinButtons = true;
        }
         if (e.parentType === "dataRow" && e.dataField === "expenseTypeId") {
            e.editorName = "dxSelectBox";
            e.editorOptions.dataSource = expenseTypes;
            e.editorOptions.displayExpr = "name";
            e.editorOptions.valueExpr = "id";
            e.editorOptions.searchEnabled = true;
        }
    };

    const getDetailsFromGridInstance = useCallback((): ExpenseDetailView[] => {
        if (detailsGridComponentRef.current && typeof detailsGridComponentRef.current.instance === 'function') {
            const gridInstance = detailsGridComponentRef.current.instance(); 
            if (gridInstance && typeof gridInstance.getDataSource === 'function') {
                const dataSource = gridInstance.getDataSource();
                if (dataSource && typeof dataSource.items === 'function') {
                    return JSON.parse(JSON.stringify(dataSource.items()));
                }
            }
        }
        console.warn("getDetailsFromGridInstance: No se pudo obtener la instancia del grid o el dataSource.");
        return [];
    }, []);

    const syncDetailsDataFromGrid = useCallback(() => {
        const currentGridDetails = getDetailsFromGridInstance();
        setDetailsData(currentGridDetails);
    }, [getDetailsFromGridInstance]);

    // SOLUCIÓN Error 2: El tipo de clave (TKey) en SavingEvent debe ser 'number'
    const handleDetailsGridSaving = (e: SavingEvent<ExpenseDetailView, number>) => { 
        if (e.changes && e.changes.length > 0) {
            const changeData = e.changes[0].data as { amount?: string | number | any };
            if (changeData && changeData.amount !== undefined && changeData.amount !== null) {
                let numericAmount: number;
                if (typeof changeData.amount === 'string') {
                    const cleanedAmountString = changeData.amount.replace(/[^0-9.-]+/g, "");
                    numericAmount = parseFloat(cleanedAmountString);
                } else if (typeof changeData.amount === 'number') {
                    numericAmount = changeData.amount;
                } else {
                    console.warn("Tipo inesperado para 'amount' en handleDetailsGridSaving:", changeData.amount);
                    numericAmount = NaN; 
                }
                if (!isNaN(numericAmount)) {
                    (e.changes[0].data as ExpenseDetailView).amount = numericAmount;
                }
            }
        }
    };
        
    // SOLUCIÓN Error 3: El tipo de clave (TKey) en SavedEvent debe ser 'number'
    const handleDetailsGridSaved = (e: SavedEvent<ExpenseDetailView, number>) => { 
        syncDetailsDataFromGrid();
    };

    const saveExpense = async () => {
        if (!headerFormComponentRef.current || typeof headerFormComponentRef.current.instance !== 'function') {
            notify('Formulario de encabezado no está listo.', 'error', 3000); return;
        }
        const headerFormInstance = headerFormComponentRef.current.instance();
        if (!headerFormInstance || typeof headerFormInstance.validate !== 'function') {
            notify('Instancia de formulario de encabezado no válida.', 'error', 3000); return;
        }
        const headerValidationResult = await headerFormInstance.validate();
        if (!headerValidationResult || !headerValidationResult.isValid) {
            notify('Complete los campos del encabezado correctamente.', 'warning', 3000); return;
        }

        if (detailsGridComponentRef.current && typeof detailsGridComponentRef.current.instance === 'function') {
            const gridInstance = detailsGridComponentRef.current.instance();
            if (gridInstance && typeof gridInstance.saveEditData === 'function') {
                await gridInstance.saveEditData();
            }
        }
        
        const currentDetailsToSubmit = [...detailsData];
        if (currentDetailsToSubmit.length === 0) {
            notify('Debe agregar al menos un detalle de gasto.', 'error', 3000); return;
        }
        const invalidDetails = currentDetailsToSubmit.some(d =>
            d.expenseTypeId === null || d.expenseTypeId === undefined || 
            typeof d.amount !== 'number' ||
            d.amount <= 0 || isNaN(d.amount)
        );
        if (invalidDetails) {
            notify('Hay detalles con datos incompletos o inválidos (Tipo de Gasto y Monto numérico > 0 son requeridos).', 'error', 4000);
            console.log("Invalid details found:", currentDetailsToSubmit.filter(d => d.expenseTypeId === null || d.expenseTypeId === undefined || typeof d.amount !== 'number' || d.amount <= 0 || isNaN(d.amount)));
            return;
        }

        setLoading(true); setIsDataGridLoading(true);
        const payload: ExpenseHeaderSubmitDto = {
            ...headerFormData,
            date: new Date(headerFormData.date.toISOString().split('T')[0]),
            details: currentDetailsToSubmit.map(d => ({
                expenseTypeId: d.expenseTypeId!,
                amount: Number(d.amount)
            }))
        };
        
        try {
            const response = await api.post<{ success?: boolean; message?: string; overflows?: BudgetOverflowDto[] }>('/Expenses', payload);
            if (response.data.overflows && response.data.overflows.length > 0) {
                let overflowMessage = "Gasto registrado con advertencias de presupuesto:\n";
                response.data.overflows.forEach((overflow: BudgetOverflowDto) => {
                    const typeName = expenseTypes.find(et => et.id === overflow.expenseTypeId)?.name || `Tipo ID ${overflow.expenseTypeId}`;
                    overflowMessage += `- ${typeName}: Presup. ${overflow.budgetAmount.toFixed(2)}, Gasto ${overflow.newExpense.toFixed(2)}, Exceso ${overflow.overflowAmount.toFixed(2)}\n`;
                });
                notify({ message: overflowMessage, type: 'warning', displayTime: 10000, width: 'auto', position: 'center', shading: true });
                resetForm();
            } else {
                notify(response.data.message || 'Gasto registrado correctamente', 'success', 3000);
                resetForm();
            }
        } catch (error: any) {
            console.error("Error al registrar el gasto:", error);
            let errorMessage = 'Error al registrar el gasto.';
            if (error.response && error.response.data) {
                 if (typeof error.response.data === 'string') errorMessage = error.response.data;
                 else if (error.response.data.message) errorMessage = error.response.data.message;
                 else if (error.response.data.title) errorMessage = error.response.data.title;
            } else if (error.message) errorMessage = error.message;
            notify(errorMessage, 'error', 5000);
        } finally {
            setLoading(false); setIsDataGridLoading(false);
        }
    };

    const resetForm = useCallback(() => {
        setHeaderFormData({ date: new Date(), fundId: null, notes: '', businessName: '', documentType: 'Factura', });
        setDetailsData([]);
        if (headerFormComponentRef.current && typeof headerFormComponentRef.current.instance === 'function') {
            const headerFormInstance = headerFormComponentRef.current.instance();
            if (headerFormInstance && typeof headerFormInstance.resetValues === 'function') {
                headerFormInstance.resetValues();
            }
        }
    }, []);

    return (
        <div className="page-container" style={{ padding: '20px' }}>
            <h2 style={{ marginBottom: '20px' }}>Registro de Gastos</h2>
            <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
                <h3 style={{ marginTop: '0', marginBottom: '15px' }}>Encabezado del Gasto</h3>
                <Form ref={headerFormComponentRef} formData={headerFormData} labelLocation="top" disabled={loading} colCount={2}>
                    <SimpleItem dataField="date" editorType="dxDateBox" editorOptions={{ width: '100%', value: headerFormData.date, onValueChanged: (e: any) => handleHeaderFieldChange('date', e.value), stylingMode: 'filled' }}><Label text="Fecha" /><RequiredRule message="La fecha es obligatoria." /></SimpleItem>
                    <SimpleItem dataField="fundId" editorType="dxSelectBox" editorOptions={{ dataSource: funds, displayExpr: 'name', valueExpr: 'id', searchEnabled: true, placeholder: 'Seleccione un fondo', width: '100%', value: headerFormData.fundId, onValueChanged: (e: any) => handleHeaderFieldChange('fundId', e.value), stylingMode: 'filled' }}><Label text="Fondo Monetario" /><RequiredRule message="El fondo es obligatorio." /></SimpleItem>
                    <SimpleItem dataField="documentType" editorType="dxSelectBox" editorOptions={{ dataSource: DOCUMENT_TYPES, placeholder: 'Seleccione tipo', width: '100%', value: headerFormData.documentType, onValueChanged: (e: any) => handleHeaderFieldChange('documentType', e.value), stylingMode: 'filled' }}><Label text="Tipo de Documento" /><RequiredRule message="El tipo de documento es obligatorio." /></SimpleItem>
                    <SimpleItem dataField="businessName" editorType="dxTextBox" editorOptions={{ placeholder: 'Ingrese nombre del comercio', width: '100%', value: headerFormData.businessName, onValueChanged: (e: any) => handleHeaderFieldChange('businessName', e.value), stylingMode: 'filled' }}><Label text="Nombre del Comercio" /><RequiredRule message="El nombre del comercio es obligatorio." /></SimpleItem>
                    <GroupItem colSpan={2}><SimpleItem dataField="notes" editorType="dxTextArea" editorOptions={{ placeholder: 'Ingrese observaciones (opcional)', height: 90, width: '100%', value: headerFormData.notes, onValueChanged: (e: any) => handleHeaderFieldChange('notes', e.value), stylingMode: 'filled' }}><Label text="Observaciones" /></SimpleItem></GroupItem>
                </Form>
            </div>
            <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '5px' }}>
                <h3 style={{ marginTop: '0', marginBottom: '15px' }}>Detalles del Gasto</h3>
                <DataGrid
                    // La prop 'ref' del componente DataGrid ahora es compatible con DataGridRef<TData, TKey>
                    ref={detailsGridComponentRef} 
                    dataSource={detailsData}
                    keyExpr="tempId" // tempId es de tipo number
                    showBorders={true}
                    columnAutoWidth={true}
                    onRowInserting={onRowInsertingDetails}
                    onEditorPreparing={onEditorPreparingDetails}
                    disabled={loading}
                    onSaving={handleDetailsGridSaving} // Prop 'onSaving' ahora es compatible
                    onSaved={handleDetailsGridSaved}   // Prop 'onSaved' ahora es compatible
                    onRowRemoved={syncDetailsDataFromGrid}
                    onRowInserted={syncDetailsDataFromGrid}
                >
                    <LoadPanel enabled={isDataGridLoading} />
                    <Paging enabled={false} />
                    <Toolbar><ToolbarItem name="addRowButton" showText="always" location="before" options={{ text: 'Agregar Detalle', icon: 'plus', disabled: loading }} /></Toolbar>
                    <Editing mode="row" allowAdding={true} allowUpdating={true} allowDeleting={true} useIcons={true} />
                    <Column dataField="expenseTypeId" caption="Tipo de Gasto"><Lookup dataSource={expenseTypes} valueExpr="id" displayExpr="name" /><RequiredRule message="El tipo de gasto es requerido." /></Column>
                    <Column dataField="amount" caption="Monto" dataType="number" format="currency"><RequiredRule message="El monto es requerido." /></Column>
                </DataGrid>
            </div>
            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button text="Limpiar Formulario" type="normal" stylingMode="outlined" onClick={resetForm} disabled={loading} icon="clear" width={180} />
                <Button text={loading ? "Guardando..." : "Guardar Gasto"} type="default" stylingMode="contained" onClick={saveExpense} disabled={loading || detailsData.length === 0 || !headerFormData.fundId || !headerFormData.businessName || !headerFormData.documentType} icon={loading ? "spindown" : "save"} width={180} />
            </div>
        </div>
    );
};

export default RegistroGastosPage;