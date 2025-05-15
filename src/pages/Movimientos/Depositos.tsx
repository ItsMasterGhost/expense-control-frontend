import React, { useState, useEffect, useRef } from 'react';
// Button se usa para ButtonItem, no necesita importación si solo se usa en buttonOptions
// import { Button } from 'devextreme-react/button';
import {
Form, // Componente React
SimpleItem,
Label,
ButtonItem,
RequiredRule,
RangeRule
} from 'devextreme-react/form';
import dxForm from 'devextreme/ui/form'; // Tipo del widget DevExtreme
import api from '../../services/api';
import notify from 'devextreme/ui/notify';
interface Fund {
id: number;
name: string;
}
interface DepositFormData {
fundId: number | null;
amount: number;
date: Date;
}
interface DepositDto {
FundId: number;
Amount: number;
Date: string;
}
const DepositosPage: React.FC = () => {
const [funds, setFunds] = useState<Fund[]>([]);
const [formData, setFormData] = useState<DepositFormData>({
fundId: null,
amount: 0,
date: new Date()
});
// Ref al componente React <Form>
const formComponentRef = useRef<React.ComponentRef<typeof Form> | null>(null);

useEffect(() => {
    const loadFunds = async () => {
        try {
            const response = await api.get('/Funds');
            setFunds(response.data);
        } catch (error) {
            console.error("Error al cargar fondos:", error);
            notify('Error al cargar fondos', 'error', 3000);
        }
    };
    loadFunds();
}, []);

const handleSubmit = async () => {
    if (!formComponentRef.current || typeof formComponentRef.current.instance !== 'function') {
        notify('Error: Formulario no inicializado correctamente.', 'error', 3000);
        console.error("handleSubmit: formComponentRef.current o .instance no es una función.");
        return;
    }

    const formInstance = formComponentRef.current.instance(); // LLAMAR para obtener dxForm

    if (!formInstance) {
        notify('Error: Instancia del formulario no disponible.', 'error', 3000);
        console.error("handleSubmit: formInstance es null después de llamar a .instance().");
        return;
    }

    // console.log("handleSubmit: formInstance:", formInstance);
    if (typeof formInstance.validate !== 'function') {
        notify('Error: Función de validación del formulario no disponible.', 'error', 3000);
        console.error("handleSubmit: formInstance.validate no es una función. formInstance:", formInstance);
        return;
    }


    const validationResult = await formInstance.validate();
    if (!validationResult || !validationResult.isValid) {
        notify('Por favor, complete correctamente todos los campos requeridos.', 'warning', 3000);
        return;
    }

    // Los datos ya están en el estado `formData` debido a los onValueChanged de cada editor.
    // No es estrictamente necesario tomarlos de formInstance.option("formData") aquí,
    // pero sería una alternativa si no actualizáramos el estado en cada cambio.
    // const currentFormValues = formInstance.option("formData") as DepositFormData;

    const depositPayload: DepositDto = {
        FundId: formData.fundId!,
        Amount: formData.amount,
        Date: formData.date.toISOString()
    };

    try {
        await api.post('/Deposits', depositPayload);
        notify('Depósito registrado con éxito', 'success', 3000);
        
        setFormData({ // Resetear el estado de React
            fundId: null,
            amount: 0,
            date: new Date()
        });
        // Resetear el widget de DevExtreme Form visualmente
        if (typeof formInstance.resetValues === 'function') {
            formInstance.resetValues();
        } else {
            console.warn("handleSubmit: formInstance.resetValues no es una función, no se pudo resetear el form visualmente.")
        }

    } catch (error: any) {
        console.error("Error al registrar depósito:", error);
        let errorMessage = 'Error al registrar depósito.';
        if (error.response && error.response.data) {
             if (typeof error.response.data === 'string') {
                errorMessage = error.response.data;
            } else if (error.response.data.message) {
                errorMessage = error.response.data.message;
            } else if (error.response.data.title) {
                errorMessage = error.response.data.title;
            } else {
                const responseDataString = String(error.response.data);
                if (responseDataString.length < 100) {
                    errorMessage = responseDataString;
                }
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        notify(errorMessage, 'error', 5000);
    }
};

// No se necesita onFormDataChange si los onValueChanged de los editores actualizan el estado.

return (
    <div className="page-container" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <h2>Registro de Depósitos</h2>
        
        <Form
            ref={formComponentRef} // Asignar la ref al componente React <Form>
            formData={formData}
            labelLocation="top"
            colCount={1}
        >
            <SimpleItem
                dataField="date"
                editorType="dxDateBox"
                editorOptions={{
                    width: '100%',
                    value: formData.date, // Asegurar que el valor está enlazado
                    onValueChanged: (e: any) => {
                        setFormData(prev => ({ ...prev, date: e.value }));
                    }
                }}
            >
                <Label text="Fecha del Depósito" />
                <RequiredRule message="La fecha es obligatoria." />
            </SimpleItem>
            
            <SimpleItem
                dataField="fundId"
                editorType="dxSelectBox"
                editorOptions={{
                    dataSource: funds,
                    displayExpr: "name",
                    valueExpr: "id",
                    placeholder: "Seleccione un fondo...",
                    searchEnabled: true,
                    width: '100%',
                    value: formData.fundId, // Asegurar que el valor está enlazado
                    onValueChanged: (e: any) => {
                        setFormData(prev => ({ ...prev, fundId: e.value }));
                    }
                }}
            >
                <Label text="Fondo Monetario" />
                <RequiredRule message="Debe seleccionar un fondo." />
            </SimpleItem>
            
            <SimpleItem
                dataField="amount"
                editorType="dxNumberBox"
                editorOptions={{
                    format: "currency",
                    showSpinButtons: true,
                    step: 100,
                    width: '100%',
                    value: formData.amount, // Asegurar que el valor está enlazado
                    onValueChanged: (e: any) => {
                        setFormData(prev => ({ ...prev, amount: e.value }));
                    }
                }}
            >
                <Label text="Monto del Depósito" />
                <RequiredRule message="El monto es obligatorio." />
                <RangeRule min={0.01} message="El monto debe ser mayor que cero." />
            </SimpleItem>
            
            <ButtonItem
                horizontalAlignment="right"
                buttonOptions={{
                    text: "Registrar Depósito",
                    type: "success",
                    // Con useSubmitBehavior: false, controlamos la validación manualmente en handleSubmit
                    // lo cual ya estamos haciendo.
                    useSubmitBehavior: false, 
                    onClick: handleSubmit,
                    icon: "chevrondoubleright",
                    width: 'auto',
                    elementAttr: {
                        class: "my-submit-button"
                    }
                }}
            />
        </Form>
    </div>
);
};
export default DepositosPage;