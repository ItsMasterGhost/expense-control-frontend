import React, { useState, useEffect, useRef, useCallback } from 'react';
import DataGrid, {
Column,
Editing,
Paging,
FilterRow,
SearchPanel,
Toolbar,
Item as ToolbarItem,
Scrolling,
LoadPanel,
HeaderFilter,
Selection,
DataGridRef
} from 'devextreme-react/data-grid';
import CustomStore from 'devextreme/data/custom_store';
import { confirm } from 'devextreme/ui/dialog';
import notify from 'devextreme/ui/notify';
import 'devextreme/dist/css/dx.light.css';
import api from '../../services/api';
import { InitNewRowEvent, SavingEvent } from 'devextreme/ui/data_grid';
interface Role {
id: number;
name: string;
}
interface UserViewData {
id?: number;
identification: string;
firstName: string;
lastName: string;
username: string;
email: string;
phone: string;
birthDate: Date | string | null;
address: string;
roles?: string[];
roleId: number | null;
password?: string;
}
interface UserRegistrationDtoPascal {
Identification: string;
FirstName: string;
LastName: string;
Username: string;
Email: string;
Phone: string;
BirthDate: string;
Address: string;
Password?: string;
RoleId: number;
}
interface UserUpdateDtoPascal {
Identification?: string;
FirstName?: string;
LastName?: string;
Email?: string;
Phone?: string;
BirthDate?: string;
Address?: string;
RoleId?: number;
Password?: string;
}
const UsuariosPage: React.FC = () => {
const [dataSource, setDataSource] = useState<CustomStore<UserViewData, number> | null>(null);
const [loading, setLoading] = useState(true);
const [roles, setRoles] = useState<Role[]>([]);
const dataGridRef = useRef<DataGridRef<UserViewData, number> | null>(null);
const currentPopupRoleIdRef = useRef<number | null>(null);
const currentPopupPasswordRef = useRef<string | undefined>(undefined);

const loadRolesAndSetupStore = useCallback(async () => {
    setLoading(true);
    try {
        const rolesResponse = await api.get<Role[]>('/UserManagement/roles');
        const loadedRoles = rolesResponse.data;
        setRoles(loadedRoles); 

        const store = new CustomStore<UserViewData, number>({
            key: 'id',
            load: async () => { 
                const usersResponse = await api.get<any[]>('/UserManagement/users'); 
                return usersResponse.data.map(user => {
                    const userRolesArray = Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : []);
                    const roleName = userRolesArray.length > 0 ? userRolesArray[0] : undefined; 
                    const roleObject = loadedRoles.find(r => r.name === roleName);
                    return {
                        ...user,
                        birthDate: user.birthDate ? new Date(user.birthDate) : null,
                        roles: userRolesArray, 
                        roleId: roleObject ? roleObject.id : null, 
                    } as UserViewData;
                });
            },
            insert: async (valuesFromSavingEvent: UserViewData) => { 
                console.log("CustomStore Insert - Values received:", JSON.stringify(valuesFromSavingEvent)); 
                
                if (valuesFromSavingEvent.roleId === null || valuesFromSavingEvent.roleId === undefined) {
                     notify('Rol es requerido (Store).', 'error'); throw new Error('Rol es requerido.');
                }
                if (!valuesFromSavingEvent.password || valuesFromSavingEvent.password.trim() === "") {
                     notify('Contraseña es requerida (Store).', 'error'); throw new Error('Contraseña es requerida.');
                }

                let birthDateISO: string;
                if (valuesFromSavingEvent.birthDate) {
                    const dateValue = typeof valuesFromSavingEvent.birthDate === 'string' ? new Date(valuesFromSavingEvent.birthDate) : valuesFromSavingEvent.birthDate;
                    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
                        birthDateISO = dateValue.toISOString();
                    } else {
                        notify('Fecha de nacimiento inválida.', 'error'); throw new Error('Fecha de nacimiento inválida.');
                    }
                } else {
                     notify('Fecha de nacimiento es requerida (Store).', 'error'); throw new Error('Fecha de nacimiento es requerida.');
                }

                const newUserPayload: UserRegistrationDtoPascal = {
                    Identification: valuesFromSavingEvent.identification,
                    FirstName: valuesFromSavingEvent.firstName,
                    LastName: valuesFromSavingEvent.lastName,
                    Username: valuesFromSavingEvent.username,
                    Email: valuesFromSavingEvent.email,
                    Phone: valuesFromSavingEvent.phone || "", 
                    BirthDate: birthDateISO,
                    Address: valuesFromSavingEvent.address || "",
                    Password: valuesFromSavingEvent.password, 
                    RoleId: valuesFromSavingEvent.roleId,
                };

                console.log("Payload PascalCase being sent to /Auth/register:", JSON.stringify(newUserPayload));

                try {
                    const response = await api.post<{ id: number }>('/Auth/register', newUserPayload);
                    const createdUserRole = loadedRoles.find(r => r.id === valuesFromSavingEvent.roleId);
                    const result = { 
                        ...valuesFromSavingEvent, 
                        id: response.data.id, 
                        roles: createdUserRole ? [createdUserRole.name] : [] 
                    };
                    notify('Usuario registrado con éxito', 'success', 3000);
                    return result;
                } catch (error: any) {
                    console.error("Error en API /Auth/register:", error.response?.data || error.message);
                    const backendError = error.response?.data;
                    let notifyMessage = 'Error al registrar usuario.';
                    if (backendError) {
                        if (typeof backendError === 'string') { notifyMessage = backendError;
                        } else if (backendError.message) { notifyMessage = backendError.message;
                        } else if (backendError.title && backendError.errors) { 
                            notifyMessage = `${backendError.title}:\n`;
                            for (const key in backendError.errors) {
                                notifyMessage += `- ${key}: ${backendError.errors[key].join(', ')}\n`;
                            }
                        } else if (typeof backendError === 'object') {
                            try { notifyMessage = JSON.stringify(backendError); if (notifyMessage.length > 200) notifyMessage = "Error del servidor (respuesta larga)." } catch { /* no hacer nada */ }
                        }
                    }
                    notify(notifyMessage, 'error', 7000);
                    throw error;
                }
            },
            update: async (key: number, values: Partial<UserViewData>) => { 
                console.log("CustomStore Update - Key:", key, "Values received (changes):", JSON.stringify(values));
                const updateUserPayload: UserUpdateDtoPascal = {};
                if (values.hasOwnProperty('identification')) updateUserPayload.Identification = values.identification;
                if (values.hasOwnProperty('firstName')) updateUserPayload.FirstName = values.firstName;
                if (values.hasOwnProperty('lastName')) updateUserPayload.LastName = values.lastName;
                if (values.hasOwnProperty('email')) updateUserPayload.Email = values.email;
                if (values.hasOwnProperty('phone')) updateUserPayload.Phone = values.phone; 
                if (values.hasOwnProperty('birthDate')) {
                    const bd = values.birthDate;
                    updateUserPayload.BirthDate = bd ? (typeof bd === 'string' ? new Date(bd) : bd).toISOString() : undefined;
                }
                if (values.hasOwnProperty('address')) updateUserPayload.Address = values.address;
                if (values.hasOwnProperty('roleId')) {
                    updateUserPayload.RoleId = values.roleId === null ? undefined : values.roleId;
                }
                if (values.password && values.password.trim() !== "") { 
                    updateUserPayload.Password = values.password; 
                }
                console.log("CustomStore Update - Payload PascalCase to send:", JSON.stringify(updateUserPayload));
                await api.put(`/UserManagement/update-user/${key}`, updateUserPayload);
                if (values.hasOwnProperty('roleId')) { 
                     const updatedUserRole = loadedRoles.find(r => r.id === values.roleId);
                     values.roles = updatedUserRole ? [updatedUserRole.name] : [];
                }
                return values; 
            },
            remove: async (key: number) => { 
                const result = await confirm('¿Está seguro que desea eliminar este usuario?', 'Confirmar eliminación');
                if (!result) { throw new Error('Operación cancelada por el usuario.'); }
                await api.delete(`/UserManagement/delete-user/${key}`);
            }
        });
        setDataSource(store);
    } catch (error) {
        console.error('Error loading data:', error);
        notify('Error al cargar datos iniciales', 'error', 5000);
    } finally {
        setLoading(false);
    }
}, []); 

useEffect(() => {
    loadRolesAndSetupStore();
}, [loadRolesAndSetupStore]);

const onEditingStart = useCallback((e: { data: UserViewData }) => {
    currentPopupRoleIdRef.current = e.data.roleId;
    currentPopupPasswordRef.current = undefined; 
    // console.log("onEditingStart - Initial popup roleId:", currentPopupRoleIdRef.current);
}, []);

const onInitNewRow = useCallback((e: InitNewRowEvent<UserViewData>) => {
    e.data.identification = '';
    e.data.firstName = '';
    e.data.lastName = '';
    e.data.username = '';
    e.data.email = '';
    e.data.birthDate = new Date(); 
    e.data.roleId = null; 
    e.data.password = ''; 
    e.data.roles = []; 
    e.data.phone = ''; // Inicializar campos requeridos por DTO
    e.data.address = ''; // Inicializar campos requeridos por DTO (si aplica)
    currentPopupRoleIdRef.current = null; 
    currentPopupPasswordRef.current = ''; 
    // console.log("onInitNewRow - Initialized, popup roleId:", currentPopupRoleIdRef.current);
}, []);

const onSaving = async (e: SavingEvent<UserViewData, number>) => {
    if (!e.changes || e.changes.length === 0) {
        console.warn("onSaving - No changes detected.");
        e.cancel = true; 
        return;
    }

    const change = e.changes[0];
    const isNewRow = change.type === 'insert';
    
    let dataToProcess: Partial<UserViewData>;

    console.log(`onSaving - Type: ${change.type}`);
    console.log("onSaving - Initial e.changes[0].data:", JSON.stringify(change.data));
    console.log("onSaving - currentPopupRoleIdRef.current (before applying):", currentPopupRoleIdRef.current);
    console.log("onSaving - currentPopupPasswordRef.current (before applying):", currentPopupPasswordRef.current);

    if (isNewRow) {
        // Para inserciones, change.data tiene los valores del formulario tal como el DataGrid los interpretó.
        // Fusionamos con los valores iniciales de onInitNewRow (que están en e.data implícitamente,
        // pero es más seguro tomar change.data como base y luego aplicar nuestras refs).
        dataToProcess = { ...change.data }; 
    } else { // Actualización
        let originalRowData: Partial<UserViewData> = {};
        if (change.key !== undefined) { 
            try {
                originalRowData = await e.component.byKey(change.key) || {};
            } catch (err) {
                console.error("onSaving (update) - Error obteniendo datos originales:", err);
            }
        }
        // Empezar con los datos originales, aplicar los cambios que el usuario hizo en el form (change.data)
        dataToProcess = { ...originalRowData, ...change.data };
    }

    // Aplicar valores de las refs como la fuente de verdad para roleId y password
    dataToProcess.roleId = currentPopupRoleIdRef.current;
    if (currentPopupPasswordRef.current !== undefined) { // Solo si la contraseña fue tocada
        dataToProcess.password = currentPopupPasswordRef.current;
    }
    
    if (!isNewRow && dataToProcess.password !== undefined && dataToProcess.password.trim() === '') {
        delete dataToProcess.password; 
    }

    console.log(`onSaving - Data after applying refs (dataToProcess):`, JSON.stringify(dataToProcess));
    
    // --- Validación usando dataToProcess ---
    // antes de la validación.
    const finalValidationObject: UserViewData = { // Crear un objeto completo para validar
        id: isNewRow ? undefined : change.key,
        identification: dataToProcess.identification || '',
        firstName: dataToProcess.firstName || '',
        lastName: dataToProcess.lastName || '',
        username: dataToProcess.username || '',
        email: dataToProcess.email || '',
        phone: dataToProcess.phone || '',
        birthDate: dataToProcess.birthDate || null,
        address: dataToProcess.address || '',
        roleId: dataToProcess.roleId,
        password: dataToProcess.password,
        roles: dataToProcess.roles || []
    };


    if (finalValidationObject.roleId === null || finalValidationObject.roleId === undefined) {
        notify('Debe seleccionar un rol.', 'error', 4000); e.cancel = true; return;
    }
    if (!finalValidationObject.identification?.trim()) { notify('La identificación es requerida.', 'error'); e.cancel = true; return; }
    if (!finalValidationObject.firstName?.trim()) { notify('El nombre es requerido.', 'error'); e.cancel = true; return; }
    if (!finalValidationObject.lastName?.trim()) { notify('El apellido es requerido.', 'error'); e.cancel = true; return; }
    if (!finalValidationObject.username?.trim()) { notify('El usuario es requerido.', 'error'); e.cancel = true; return; }
    if (!finalValidationObject.email?.trim()) { notify('El email es requerido.', 'error'); e.cancel = true; return; }
    if (!finalValidationObject.phone?.trim()) { notify('El teléfono es requerido.', 'error'); e.cancel = true; return; }
    if (!finalValidationObject.birthDate) { notify('La fecha de nacimiento es requerida.', 'error'); e.cancel = true; return; }

    if (isNewRow) {
        if (!finalValidationObject.password || finalValidationObject.password.trim() === '') {
            notify('La contraseña es requerida para nuevos usuarios.', 'error', 4000); e.cancel = true; return;
        }
        if (finalValidationObject.password.trim().length < 6) {
            notify('La contraseña debe tener al menos 6 caracteres.', 'error', 4000); e.cancel = true; return;
        }
    } else { 
        if (finalValidationObject.password && finalValidationObject.password.trim().length > 0 && finalValidationObject.password.trim().length < 6) {
            notify('La nueva contraseña debe tener al menos 6 caracteres.', 'error', 4000); e.cancel = true; return;
        }
    }

    // Actualizar el objeto e.changes[0].data que se pasará al CustomStore
    if (isNewRow) {
        // Para insert, CustomStore.insert espera el objeto completo.
        // Usar finalValidationObject que tiene todos los campos.
        e.changes[0].data = { ...finalValidationObject }; 
    } else {
        // Para update, CustomStore.update espera SOLO los campos que realmente cambiaron.
        // Reconstruir el objeto de cambios basado en lo que el usuario tocó y nuestras correcciones.
        const finalChangesForUpdate: Partial<UserViewData> = {};
        // Comparar finalValidationObject con el originalRowData (obtenido antes)
        // o simplemente tomar los campos de change.data y aplicarles roleId/password de finalValidationObject.
        // Es más simple tomar los cambios originales y aplicar las refs.
        for (const key in change.data) { // Iterar sobre los campos que el grid detectó como cambiados
            if (Object.prototype.hasOwnProperty.call(change.data, key)) {
                (finalChangesForUpdate as any)[key] = (finalValidationObject as any)[key];
            }
        }
        // Asegurar que roleId y password (si se procesaron) estén en los cambios
        if (finalValidationObject.hasOwnProperty('roleId')) {
            finalChangesForUpdate.roleId = finalValidationObject.roleId;
        }
        if (finalValidationObject.hasOwnProperty('password')) {
            finalChangesForUpdate.password = finalValidationObject.password;
        } else if (change.data.hasOwnProperty('password') && !finalValidationObject.hasOwnProperty('password')) {
            // Si password fue eliminado de finalValidationObject (porque estaba vacío y es update)
            delete finalChangesForUpdate.password;
        }
        e.changes[0].data = finalChangesForUpdate;
    }
    console.log("onSaving - Final e.changes[0].data for CustomStore:", JSON.stringify(e.changes[0].data));
};
    
return (
    <div className="usuarios-container" style={{ padding: '20px' }}>
        <h2 style={{ marginBottom: '10px' }}>Gestión de Usuarios</h2>
        <DataGrid
            ref={dataGridRef}
            dataSource={dataSource}
            keyExpr="id"
            showBorders={true}
            columnAutoWidth={true}
            hoverStateEnabled={true}
            height="auto" 
            remoteOperations={false} 
            onEditingStart={onEditingStart}
            onInitNewRow={onInitNewRow}
            onSaving={onSaving}
        >
            <Selection mode="single" />
            <LoadPanel enabled={loading} />
            <Scrolling mode="virtual" />
            <Paging defaultPageSize={15} />
            <FilterRow visible={true} />
            <HeaderFilter visible={true} />
            <SearchPanel visible={true} width={250} placeholder="Buscar..." />
            
            <Toolbar>
                <ToolbarItem name="addRowButton" showText="always" location="after" options={{ text: "Agregar Usuario" }} />
                <ToolbarItem name="searchPanel" location="before" />
            </Toolbar>

            <Editing
                mode="popup"
                allowAdding={true}
                allowUpdating={true}
                allowDeleting={true} 
                useIcons={true}
                popup={{
                    title: 'Información del Usuario',
                    showTitle: true,
                    width: 700,
                    height: 'auto', 
                }}
                form={{ 
                    labelLocation: 'top',
                    colCount: 2,
                    items: [
                        { dataField: 'identification', label: { text: 'Identificación' }, validationRules: [{ type: 'required' }] },
                        { dataField: 'firstName', label: { text: 'Nombre' }, validationRules: [{ type: 'required' }] },
                        { dataField: 'lastName', label: { text: 'Apellido' }, validationRules: [{ type: 'required' }] },
                        { dataField: 'username', label: { text: 'Usuario' }, validationRules: [{ type: 'required' }] },
                        { 
                            dataField: 'email', 
                            label: { text: 'Email' },
                            validationRules: [{ type: 'required' }, { type: 'email' }] 
                        },
                        { 
                            dataField: 'phone', 
                            label: { text: 'Teléfono (Requerido)' },
                            validationRules: [{type: 'required', message: 'El teléfono es requerido.'}]
                        },
                        { 
                            dataField: 'birthDate', 
                            label: { text: 'Fecha Nacimiento (Requerida)' },
                            editorType: 'dxDateBox',
                            editorOptions: { 
                                type: 'date', displayFormat: 'dd/MM/yyyy', width: '100%',
                                max: new Date() 
                            },
                            validationRules: [{type: 'required', message: 'La fecha de nacimiento es requerida.'}]
                        },
                        { 
                            dataField: 'address', 
                            label: { text: 'Dirección' },
                            editorType: 'dxTextArea',
                            colSpan: 2, 
                            editorOptions: { height: 70 }
                        },
                        {
                            itemType: 'group', 
                            colCount: 2,
                            items: [
                                {
                                    dataField: 'roleId', 
                                    label: { text: 'Rol' },
                                    editorType: 'dxSelectBox',
                                    editorOptions: {
                                        dataSource: roles, 
                                        displayExpr: 'name',
                                        valueExpr: 'id',
                                        searchEnabled: true,
                                        placeholder: 'Seleccione un rol...',
                                        onValueChanged: (e: any) => {
                                            currentPopupRoleIdRef.current = e.value;
                                        }
                                    },
                                    validationRules: [{ type: 'required', message: 'El rol es requerido.' }]
                                },
                                {
                                    dataField: 'password',
                                    label: { text: 'Contraseña' },
                                    editorType: 'dxTextBox',
                                    editorOptions: {
                                        mode: 'password',
                                        placeholder: 'Mín. 6 caracteres (requerida para nuevos)',
                                        onValueChanged: (e: any) => {
                                            currentPopupPasswordRef.current = e.value;
                                        }
                                    },
                                    // La validación de longitud se puede añadir aquí también
                                    // validationRules: [{ type: 'stringLength', min: 6, message: 'Mínimo 6 caracteres'}]
                                },
                            ]
                        }
                    ]
                }}
            />
            <Column dataField="identification" caption="Identificación" width={130} />
            <Column dataField="firstName" caption="Nombre" />
            <Column dataField="lastName" caption="Apellido" />
            <Column dataField="username" caption="Usuario" />
            <Column dataField="email" caption="Email" width={200} />
            <Column dataField="phone" caption="Teléfono" width={120} />
            <Column dataField="birthDate" caption="F. Nacimiento" dataType="date" format="dd/MM/yyyy" width={120} />
            <Column dataField="address" caption="Dirección" visible={false} /> 
            <Column 
                dataField="roles" 
                caption="Rol Asignado"
                allowEditing={false} 
                cellRender={({ data }: { data: UserViewData }) => (
                    <span>{data.roles?.join(', ')}</span>
                )}
                width={150}
            />
        </DataGrid>
    </div>
);
};
export default UsuariosPage;

//aaaaaaahh por fin