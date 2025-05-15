import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'devextreme-react/button';
import DataGrid, { 
    Column, 
    Editing, 
    Paging, 
    RequiredRule as GridRequiredRule,
    LoadPanel // SOLUCIÓN Error 1: Importar LoadPanel
} from 'devextreme-react/data-grid';
import { Popup } from 'devextreme-react/popup';
import {
    Form, 
    SimpleItem,
    Label,
    ButtonItem,
    RequiredRule,
    GroupItem,
    EmptyItem,
} from 'devextreme-react/form';
// dxForm ya no es necesario si usamos React.ComponentRef<typeof Form> para la ref
// import dxForm from 'devextreme/ui/form'; 
import api from '../../services/api';
import notify from 'devextreme/ui/notify';

interface Fund {
    id: number;
    name: string;
    description: string;
    currentBalance: number;
}

interface FundDto {
    Name: string;
    Description: string;
    InitialBalance?: number;
}

interface FundFormData {
    name: string;
    description: string;
    initialBalance?: number;
    currentBalance?: number;
    id?: number;
}

const FondosPage: React.FC = () => {
    const [funds, setFunds] = useState<Fund[]>([]);
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [currentFundFormData, setCurrentFundFormData] = useState<FundFormData>({
        name: '',
        description: '',
        initialBalance: 0,
    });
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const formComponentRef = useRef<React.ComponentRef<typeof Form> | null>(null);

    const loadFunds = async () => {
        setIsLoading(true);
        try {
            const response = await api.get<Fund[]>('/Funds');
            if (response.data && Array.isArray(response.data)) {
                setFunds(response.data);
            } else {
                console.error("Respuesta inesperada de la API al cargar fondos:", response);
                setFunds([]);
                notify('Respuesta inesperada del servidor al cargar fondos.', 'warning', 3000);
            }
        } catch (error: any) {
            console.error("Error al cargar fondos:", error);
            setFunds([]);
            let errorMessage = 'Error al cargar fondos.';
            if (error.response) {
                errorMessage = `Error ${error.response.status}: ${error.response.data?.message || error.response.data || 'Error del servidor'}`;
            } else if (error.request) {
                errorMessage = 'No se pudo conectar al servidor para cargar fondos.';
            } else {
                errorMessage = error.message || 'Ocurrió un error desconocido.';
            }
            notify(errorMessage, 'error', 4000);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isPopupVisible && !isEditing && formComponentRef.current && typeof formComponentRef.current.instance === 'function') {
            const timerId = setTimeout(() => {
                const formInstance = formComponentRef.current?.instance(); // Llama para obtener el widget dxForm
                if (formInstance && typeof formInstance.resetValues === 'function') {
                    formInstance.resetValues();
                }
            }, 0);
            return () => clearTimeout(timerId);
        }
    }, [isPopupVisible, isEditing]);


    const handleOpenNewFundPopup = () => {
        setIsEditing(false);
        setCurrentFundFormData({ name: '', description: '', initialBalance: 0 }); 
        setIsPopupVisible(true);
    };

    const handleEditFundStart = (e: any) => {
        const fundToEdit = e.data as Fund;
        setIsEditing(true);
        setCurrentFundFormData({
            id: fundToEdit.id,
            name: fundToEdit.name,
            description: fundToEdit.description,
            currentBalance: fundToEdit.currentBalance
        });
        setIsPopupVisible(true);
        e.cancel = true; 
    };

    const handleSaveFund = async () => {
        if (!formComponentRef.current || typeof formComponentRef.current.instance !== 'function') {
            notify('Error: Formulario no inicializado.', 'error', 3000); return;
        }
        const formInstance = formComponentRef.current.instance(); // Llama para obtener el widget dxForm
        if (!formInstance) {
            notify('Error: Instancia del formulario no disponible.', 'error', 3000); return;
        }

        const validationResult = await formInstance.validate();
        if (!validationResult || !validationResult.isValid) {
            notify('Por favor, corrija los errores del formulario.', 'warning', 2000); return;
        }

        const formValues = formInstance.option("formData") as FundFormData;

        try {
            setIsLoading(true);
            if (isEditing && formValues.id) {
                const fundUpdatePayload = { 
                    Name: formValues.name, 
                    Description: formValues.description 
                };
                await api.put(`/Funds/${formValues.id}`, fundUpdatePayload);
                notify('Fondo actualizado con éxito', 'success', 3000);
            } else {
                const fundCreationPayload: FundDto = {
                    Name: formValues.name,
                    Description: formValues.description,
                    InitialBalance: formValues.initialBalance ?? 0
                };
                await api.post('/Funds', fundCreationPayload);
                notify('Fondo creado con éxito', 'success', 3000);
            }
            setIsPopupVisible(false);
            loadFunds(); 
        } catch (error: any) {
            console.error(`Error al ${isEditing ? 'actualizar' : 'crear'} fondo:`, error);
            let errorMessage = `Error al ${isEditing ? 'actualizar' : 'crear'} fondo.`;
            if (error.response?.data) {
                 if (typeof error.response.data === 'string') errorMessage = error.response.data;
                 else if (error.response.data.message) errorMessage = error.response.data.message;
                 else if (error.response.data.title) errorMessage = error.response.data.title;
            } else if (error.message) {
                errorMessage = error.message;
            }
            notify(errorMessage, 'error', 4000);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteFund = async (e: any) => {
        const fundIdToDelete = e.data.id;
        // const userConfirmed = await confirm("¿Está seguro?", "Confirmar Eliminación");
        // if (!userConfirmed) return;
        try {
            setIsLoading(true);
            await api.delete(`/Funds/${fundIdToDelete}`);
            notify('Fondo eliminado con éxito', 'success', 3000);
            loadFunds();
        } catch (error: any) {
            console.error("Error al eliminar fondo:", error);
            notify(error.response?.data?.message || 'Error al eliminar fondo', 'error', 3000);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadFunds();
    }, []); 

    const onHidingPopup = () => {
        setIsPopupVisible(false);
    };
    
    const editingPopupOptions = { title: 'Editar Fondo', showTitle: true, width: 500, height: 'auto' };

    return (
        <div className="page-container" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Fondos Monetarios</h2>
                <Button text="Nuevo Fondo" icon="plus" onClick={handleOpenNewFundPopup} type="default" stylingMode="contained" disabled={isLoading} />
            </div>

            {isLoading && funds.length === 0 && <p>Cargando fondos...</p>} {/* Mostrar solo si está cargando y aún no hay fondos */}
            {!isLoading && funds.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', border: '1px dashed #ccc', margin: '20px 0' }}>
                    <p>No hay fondos monetarios registrados.</p>
                    <p>Haga clic en "Nuevo Fondo" para agregar el primero.</p>
                </div>
            )}
            {/* Mostrar el DataGrid si no está cargando y hay fondos, o si terminó de cargar (incluso si no hay fondos, para mostrar "No data") */}
            {(funds.length > 0 || !isLoading) && ( 
                <DataGrid
                    dataSource={funds}
                    keyExpr="id"
                    showBorders={true}
                    columnAutoWidth={true}
                    hoverStateEnabled={true}
                    onEditingStart={handleEditFundStart}
                    onRowRemoving={handleDeleteFund} 
                    remoteOperations={false} 
                    noDataText={isLoading ? 'Cargando...' : 'No hay datos para mostrar'} // Mensaje cuando no hay datos
                >
                    <LoadPanel enabled={isLoading} /> {/* El LoadPanel del DataGrid */}
                    <Paging defaultPageSize={10} />
                    <Editing 
                        mode="popup" 
                        allowUpdating={true} 
                        allowDeleting={true} 
                        allowAdding={false} 
                        useIcons={true} 
                        popup={editingPopupOptions}
                    />
                    <Column dataField="name" caption="Nombre">
                        <GridRequiredRule message="El nombre es obligatorio" />
                    </Column>
                    <Column dataField="description" caption="Descripción" />
                    <Column 
                        dataField="currentBalance" 
                        caption="Saldo Actual" 
                        dataType="number" 
                        format="currency" 
                        alignment="right" 
                        allowEditing={false} 
                    />
                </DataGrid>
            )}

            {isPopupVisible && (
                <Popup
                    visible={isPopupVisible}
                    onHiding={onHidingPopup}
                    dragEnabled={false}
                    showCloseButton={true}
                    title={isEditing ? "Editar Fondo Monetario" : "Nuevo Fondo Monetario"}
                    width={500}
                    height="auto" 
                    showTitle={true}
                >
                    <Form
                        key={isEditing && currentFundFormData.id ? `edit-${currentFundFormData.id}` : 'new-fund-form'}
                        formData={currentFundFormData}
                        ref={formComponentRef} 
                        labelLocation="top"
                        disabled={isLoading} 
                    >
                        <SimpleItem dataField="name" editorType="dxTextBox">
                            <Label text="Nombre del Fondo" />
                            <RequiredRule message="El nombre es obligatorio." />
                        </SimpleItem>
                        <SimpleItem dataField="description" editorType="dxTextArea" editorOptions={{ height: 90 }}>
                            <Label text="Descripción" />
                        </SimpleItem>
                        
                        {!isEditing && (
                            <SimpleItem 
                                dataField="initialBalance" 
                                editorType="dxNumberBox"
                                editorOptions={{ 
                                    format: '#,##0.00',
                                    showSpinButtons: true,
                                    step: 100,
                                    min: 0, 
                                }}
                            >
                                <Label text="Saldo Inicial" />
                                <RequiredRule message="El saldo inicial es obligatorio." />
                            </SimpleItem>
                        )}
                        
                        {isEditing && currentFundFormData.currentBalance !== undefined && (
                            <SimpleItem 
                                dataField="currentBalance" 
                                editorType="dxNumberBox"
                                editorOptions={{ format: '#,##0.00', readOnly: true }}
                            >
                                <Label text="Saldo Actual (No editable)" />
                            </SimpleItem>
                        )}
                        <EmptyItem /> 
                        {/* SOLUCIÓN Error 2: Eliminar la prop 'style' de GroupItem */}
                        <GroupItem colCount={2} cssClass="popup-buttons-group"> 
                             <ButtonItem
                                horizontalAlignment="left"
                                buttonOptions={{
                                    text: 'Cancelar',
                                    type: 'normal',
                                    stylingMode: 'outlined',
                                    onClick: () => setIsPopupVisible(false),
                                    icon: 'close',
                                    disabled: isLoading
                                }}
                            />
                            <ButtonItem
                                horizontalAlignment="right"
                                buttonOptions={{
                                    text: isEditing ? 'Guardar Cambios' : 'Crear Fondo',
                                    type: 'success',
                                    stylingMode: 'contained',
                                    useSubmitBehavior: false, 
                                    onClick: handleSaveFund,
                                    icon: 'save',
                                    disabled: isLoading
                                }}
                            />
                        </GroupItem>
                    </Form>
                </Popup>
            )}
        </div>
    );
};

export default FondosPage;