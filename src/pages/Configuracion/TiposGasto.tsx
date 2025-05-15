import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from 'devextreme-react/button'; // Puede no ser necesario si solo usas la toolbar del grid
import {
    DataGrid, // Componente React
    Column,
    Editing,
    Paging,
    FilterRow,
    SearchPanel,
    Toolbar,
    Item as ToolbarItem,
    Scrolling,
    LoadPanel,
    RequiredRule,
    DataGridRef 
} from 'devextreme-react/data-grid';
import CustomStore from 'devextreme/data/custom_store';
import { LoadOptions } from 'devextreme/data/load_options';
import api from '../../services/api';
import notify from 'devextreme/ui/notify';
import 'devextreme/dist/css/dx.light.css';
// import '../../styles/tipogasto.css'; // Descomenta si tienes estilos específicos

// Importar tipos de eventos del DataGrid
import { 
    RowInsertingEvent, 
    RowUpdatingEvent, 
    RowRemovingEvent, 
    InitNewRowEvent,
    SavingEvent 
} from 'devextreme/ui/data_grid'; 

interface TipoGasto {
    id: number; 
    code: string;
    name: string;
    description: string;
}

// DTO para enviar al backend
interface TipoGastoDto {
    code: string;
    name: string;
    description: string;
}

const TiposGastoPage: React.FC = () => {
    const [dataSource, setDataSource] = useState<CustomStore<TipoGasto, number> | null>(null);
    const [loading, setLoading] = useState(false);

    const dataGridComponentRef = useRef<DataGridRef<TipoGasto, number> | null>(null);

    const getNextCode = async (): Promise<string> => {
        try {
            const gridInstance = dataGridComponentRef.current?.instance();
            if (gridInstance) {
                // Para que getDataSource().items() funcione bien sin paginación de servidor,
                // el store.load debe haber cargado todos los datos, o el grid debe tenerlos.
                // Si hay paginación de servidor, este enfoque para getNextCode no es ideal.
                const items = await gridInstance.getDataSource().items() as TipoGasto[];
                if (items && items.length > 0) {
                    let maxNum = 0;
                    items.forEach(item => {
                        const match = item.code.match(/\d+$/); 
                        if (match) {
                            const num = parseInt(match[0], 10);
                            if (num > maxNum) {
                                maxNum = num;
                            }
                        } else if (!isNaN(Number(item.code))) { 
                           const num = Number(item.code);
                           if (num > maxNum) maxNum = num;
                        }
                    });
                    const nextNum = maxNum + 1;
                    const prefix = "TG"; 
                    return `${prefix}${String(nextNum).padStart(3, '0')}`; 
                }
                return "TG001"; 
            }
            return "TG001"; 
        } catch (error) {
            console.error("Error generando el siguiente código:", error);
            return `ERR-${Date.now()}`; 
        }
    };


    useEffect(() => {
        const store = new CustomStore<TipoGasto, number>({
            key: 'id',
            load: async (loadOptions: LoadOptions) => {
                setLoading(true);
                try {
                    const response = await api.get<TipoGasto[]>('/ExpenseTypes');
                    return { 
                        data: response.data, 
                        totalCount: response.data.length // Asume que no hay paginación de servidor
                    };
                } catch (error) {
                    notify('Error al cargar tipos de gasto', 'error', 3000);
                    throw error; 
                } finally { 
                    setLoading(false); 
                }
            },
            insert: async (values: TipoGastoDto) => { 
                // 'values' contendrá el 'code' generado en onInitNewRow
                try {
                    const response = await api.post<TipoGasto>('/ExpenseTypes', values);
                    notify('Tipo de Gasto creado', 'success', 2000);
                    return response.data; 
                } catch (error: any) {
                    notify(error.response?.data?.message || 'Error al crear tipo de gasto', 'error', 3000);
                    throw error;
                }
            },
            update: async (key: number, values: Partial<TipoGasto>) => { 
                try {
                    // 'code' no se envía desde el form de edición si no está en `editing.form.items`.
                    // Si se permitiera actualizar el código, debería estar en el form y aquí en el payload.
                    const payload: Partial<TipoGastoDto> = { 
                        name: values.name, 
                        description: values.description 
                        // Si el código pudiera cambiar y estuviera en 'values':
                        // code: values.code 
                    };
                    const response = await api.put<TipoGasto>(`/ExpenseTypes/${key}`, payload);
                    notify('Tipo de Gasto actualizado', 'success', 2000);
                    return response.data; 
                } catch (error: any) {
                    notify(error.response?.data?.message || 'Error al actualizar tipo de gasto', 'error', 3000);
                    throw error;
                }
            },
            remove: async (key: number) => {
                try {
                    await api.delete(`/ExpenseTypes/${key}`);
                    notify('Tipo de Gasto eliminado', 'success', 2000);
                } catch (error: any) {
                    notify(error.response?.data?.message || 'Error al eliminar tipo de gasto', 'error', 3000);
                    throw error;
                }
            }
        });
        setDataSource(store);
    }, []);

    const onInitNewRow = async (e: InitNewRowEvent<TipoGasto>) => {
        setLoading(true); 
        try {
            const nextCode = await getNextCode();
            e.data.code = nextCode;
            e.data.name = ""; // Valor inicial para nombre
            e.data.description = ""; // Valor inicial para descripción
        } catch (error) {
            notify('Error al generar el código para el nuevo tipo de gasto.', 'error');
            e.data.code = "ERROR"; 
        } finally { 
            setLoading(false); 
        }
    };
    
    const onSavingCustomLogic = async (e: SavingEvent<TipoGasto, number>): Promise<void> => {
        if (e.changes && e.changes.length > 0) {
            const dataToSave = e.changes[0].data as Partial<TipoGasto>;
            if (dataToSave.name && dataToSave.name.trim().length < 3) {
                e.cancel = true; 
                notify('El nombre debe tener al menos 3 caracteres.', 'error');
                return; 
            }
        }
    };

    const onRowRemoving = (e: RowRemovingEvent<TipoGasto, number>) => {
        // Ejemplo de confirmación:
        // e.cancel = new Promise((resolve) => {
        //   confirm("¿Está seguro de que desea eliminar este tipo de gasto?", "Confirmar Eliminación")
        //     .then((dialogResult) => {
        //       resolve(!dialogResult); // Resuelve a true para cancelar si dialogResult es false (usuario dijo no)
        //     });
        // });
    };

    return (
        <div className="grid-container" style={{ padding: '20px' }}>
            <h2 style={{ marginBottom: '10px' }}>Mantenimiento de Tipos de Gasto</h2>
            
            {dataSource && (
                <DataGrid
                    ref={dataGridComponentRef}
                    dataSource={dataSource}
                    keyExpr="id"
                    showBorders={true}
                    columnAutoWidth={true}
                    hoverStateEnabled={true}
                    remoteOperations={false} 
                    onInitNewRow={onInitNewRow}
                    onSaving={onSavingCustomLogic} 
                    onRowRemoving={onRowRemoving}
                >
                    <LoadPanel enabled={loading} />
                    <Scrolling mode="virtual" /> 
                    <Paging defaultPageSize={10} />
                    <FilterRow visible={true} />
                    <SearchPanel visible={true} width={250} placeholder="Buscar..." />

                    <Toolbar>
                        <ToolbarItem name="addRowButton" showText="always" location="after" 
                            options={{ text: 'Nuevo Tipo de Gasto' }}/>
                        <ToolbarItem name="searchPanel" location="before" />
                    </Toolbar>

                    <Editing
                        mode="popup" 
                        allowAdding={true}
                        allowUpdating={true}
                        allowDeleting={true}
                        useIcons={true}
                        confirmDelete={true}
                        popup={{
                            title: "Tipo de Gasto",
                            showTitle: true,
                            width: 600, // Ajusta el ancho según sea necesario
                            height: 'auto', 
                        }}
                        form={{ // Configura el formulario dentro del popup de edición
                            labelLocation: 'top',
                            colCount: 1, 
                            items: [
                                // El campo 'code' no se incluye aquí, por lo tanto no aparecerá en el popup.
                                // Se genera en onInitNewRow y se muestra en la columna del grid (read-only).
                                {
                                    dataField: 'name',
                                    label: { text: 'Nombre' },
                                    validationRules: [{ type: 'required', message: 'El nombre es requerido.' }]
                                },
                                {
                                    dataField: 'description',
                                    editorType: 'dxTextArea', 
                                    label: { text: 'Descripción' },
                                    editorOptions: { height: 90 }
                                }
                            ]
                        }}
                    />

                    <Column 
                        dataField="code" 
                        caption="Código" 
                        width={150} 
                        allowEditing={false} // El código no es editable en el grid ni en el formulario si no está en items
                    /> 
                    <Column dataField="name" caption="Nombre">
                        <RequiredRule message="El nombre es obligatorio." />
                    </Column>
                    <Column dataField="description" caption="Descripción" />
                </DataGrid>
            )}
        </div>
    );
};

export default TiposGastoPage;