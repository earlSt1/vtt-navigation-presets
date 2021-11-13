export const modName = 'Navigation Presets';
const mod = 'navigation-presets';


function isEventRightClick(ev){
    let isRightMB = false;
    if ("which" in ev)
        isRightMB = ev.which == 3; 
    else if ("button" in ev)
        isRightMB = ev.button == 2;
    return isRightMB
}
function generateRandomPresetName(){
    return Math.random().toString(36).replace('0.','npreset_' || '');
}
Handlebars.registerHelper('ifInPreset', function(presetId, scenes, options) {
    if (scenes != null && scenes.includes(presetId)) {
      return options.fn(this);
    }
    return options.inverse(this);
});
function getVisibleNavIds(){
    let sceneIds = []
    for (let nav of document.querySelectorAll('li.nav-item.scene')){
        sceneIds.push(nav.getAttribute('data-scene-id'));
    }
    return sceneIds;
}
function alphaSortScenes(scenes){
    scenes.sort(function(a,b){
        if (a.name<b.name)
            return -1;
        else if (a.name>b.name)
            return 1;
        return 0;
    });
    return scenes;
}
function alphaSortPresets(presets){
    let sorted = Object.values(presets).sort(function(a,b){
        if (a.titleText<b.titleText)
            return -1;
        else if (a.titleText>b.titleText)
            return 1;
        return 0;
    })
    return sorted;
}
function generatePlayerIcons(preset){
    let playerIconList = [];
    for (let scene of document.querySelectorAll('li.scene.nav-item')){
        if (preset.sceneList.includes(scene.getAttribute('data-scene-id'))){
            let players = scene.querySelectorAll('.scene-players > .scene-player')
            if (players != null){
                for (let player of players){
                    let newPlayer = player.cloneNode();
                    newPlayer.innerText = player.innerText;
                    playerIconList.push(newPlayer);
                }
            }
        }
    }
    return playerIconList;
}
function presetHasActiveScene(preset){
    for (let scene of document.querySelectorAll('li.scene.nav-item')){
        if (preset.sceneList.includes(scene.getAttribute('data-scene-id'))){
            if (scene.querySelector('i.fa-bullseye') != null){
                return true;
            }
        }
    }
    return false;
}
export class NavigationPreset{
    constructor(title,color){
        this.title = title;
        this.color = color;
        this.scenes = [];
        this.uid=generateRandomPresetName();
        this.active = false;
    }
    initFromExisting(existing){
        this.title = existing['titleText'];
        this.color = existing['colorText']
        this.scenes = existing['sceneList'];
        this.uid = existing['_id'];
        this.active=existing['isActive'];
    }
    get uid(){return this._id;}
    set uid(id){this._id=id;}
    get title(){return this.titleText;}
    get color(){return this.colorText;}
    set title(ntitle){this.titleText = ntitle;}
    set color(ncolor){this.colorText = ncolor;}
    get scenes(){return this.sceneList;}
    set scenes(scenes){this.sceneList = scenes;}
    get active(){return this.isActive};
    set active(a){this.isActive=a;}
    addScene(scene){
        this.scenes.push(scene);
    }
}

async function initPresets(){
    let allPresets = Settings.getPresets();
    let sceneIds = getVisibleNavIds();
    allPresets['default'] = {'sceneList':sceneIds,'titleText':'Default','_id':'default','colorText':'#000000','isActive':true}
    if (game.ready)
        await game.settings.set(mod,'npresets',allPresets);
    else
        Hooks.once('ready',async function(){
            await game.settings.set(mod,'npresets',allPresets);
        })

}
function clearExistingElements(){
    let createButton = document.querySelector('a.create-preset')
    let navMenu = document.querySelector('nav#navpresets-menu')
    let activePreset = document.querySelector('a.scene-presets')
    if (createButton != null){
        createButton.parentElement.removeChild(createButton);
    }
    if (navMenu != null){
        navMenu.parentElement.removeChild(navMenu);
    }
    if (activePreset!=null){
        activePreset.parentElement.removeChild(activePreset);
    }
}
async function assignNewNavItemsToDefault(existingNavItems){
    let allPresets = Settings.getPresets();
    let assigned = []
    let unassigned = []
    for (let preset of Object.values(allPresets)){
        assigned = assigned.concat(preset.sceneList);
    }
    for (let navItem of existingNavItems){
        if (!assigned.includes(navItem.getAttribute('data-scene-id'))){
            unassigned.push(navItem.getAttribute('data-scene-id'));
        }
    }
    allPresets['default'].sceneList = allPresets['default'].sceneList.concat(unassigned)
    if (game.ready)
        await game.settings.set(mod,'npresets',allPresets)
    else
        Hooks.once('ready',async function(){
            await game.settings.set(mod,'npresets',allPresets);
        })
}
async function filterNavItemsToActivePreset(activePreset){
    let existingNavItems = document.querySelectorAll('li.nav-item.scene')
    if (game.user.isGM)
        await assignNewNavItemsToDefault(existingNavItems);
    for (let navItem of existingNavItems){
        if (!activePreset.sceneList.includes(navItem.getAttribute('data-scene-id'))){
            navItem.style.display='none';
        }else{
            navItem.style.display='';
        }
    }
}
function setupPresets(){
    Settings.checkActivePresetExists();
    let allPresets = Settings.getPresets();
    let activePreset = allPresets[Settings.getActivePresetId()]
    clearExistingElements()
    
    let navbar = document.querySelector('ol#scene-list');
    
    // Visible preset
    let dropdown = document.createElement('a');
    dropdown.classList.add('scene-presets');
    let caretIcon = document.createElement('i');
    caretIcon.classList.add('fas','fa-caret-right');
    
    dropdown.innerHTML=caretIcon.outerHTML+activePreset.titleText;
    dropdown.style.backgroundColor=activePreset.colorText
    dropdown.setAttribute('data-npreset-id',activePreset._id);

    

    // Other presets
    let contextItems = document.createElement('ol');
    contextItems.classList.add('context-items','flexrow');
    let presetMenu = document.createElement('nav');
    presetMenu.classList.add('expand-down');
    presetMenu.id='navpresets-menu'
    for (let preset of alphaSortPresets(allPresets)){
        if (preset._id === 'default' && preset.sceneList?.length === 0) continue;
        if (preset._id != activePreset._id){
            let preset1 = document.createElement('li');
            preset1.classList.add('nav-preset');
            if (presetHasActiveScene(preset)){
                let bullseye = document.createElement('i');
                bullseye.classList.add('fas','fa-bullseye');
                preset1.innerHTML=bullseye.outerHTML+preset.titleText;    
            }else{
                preset1.innerHTML=preset.titleText;
            }
            preset1.style.backgroundColor=preset.colorText;
            preset1.setAttribute('data-npreset-id',preset._id);
            
            //Player icons
            let playerIcons = generatePlayerIcons(preset);
            if (playerIcons.length>0){
                let playerList = document.createElement('ul')
                playerList.classList.add('scene-players')
                for (let player of playerIcons){
                    playerList.appendChild(player);
                }
                preset1.appendChild(playerList);
            }
            contextItems.appendChild(preset1);
        }
    }
    presetMenu.appendChild(contextItems);
    presetMenu.style.display='none';


    navbar.insertAdjacentElement('afterbegin',dropdown);
    navbar.insertAdjacentElement('afterbegin',presetMenu);
    //Create button
    if (game.user.isGM){
        let createButton = document.createElement('a');
        createButton.classList.add('create-preset');
        createButton.title='Create Preset';
        createButton.style.backgroundColor='rgba(0, 0, 0, 0.5)'
        let createIcon = document.createElement('i');
        createIcon.classList.add('fas','fa-plus');

        createButton.innerHTML=createIcon.outerHTML;
        navbar.insertAdjacentElement('afterbegin',createButton);
        createButton.addEventListener('click',function(){
            let newFolder = new NavigationPreset('New Preset','');
            new NavigationPresetEditConfig(newFolder).render(true);
        })
    }
    
    filterNavItemsToActivePreset(activePreset)
}
function createContextMenu(parent){
    if (document.querySelector('nav#preset-context-menu')!=null){
        closeContextMenu()
    }
    let presetContextMenu = document.createElement('nav');
    presetContextMenu.classList.add('expand-down');
    presetContextMenu.id='preset-context-menu';
    if (parent.classList.contains('nav-preset')){
        presetContextMenu.style.marginLeft = parent.offsetLeft+'px';
    }
    let presetContextMenuList = document.createElement('ol');
    presetContextMenuList.classList.add('context-items');

    let presetEditOption = document.createElement('li');
    presetEditOption.classList.add('context-item')
    let editIcon = document.createElement('i');
    editIcon.classList.add('fas','fa-cog');
    presetEditOption.innerHTML=editIcon.outerHTML+"Edit";

    presetContextMenuList.appendChild(presetEditOption);

    if (parent.getAttribute('data-npreset-id')!='default'){
        let presetDeleteOption = document.createElement('li');
        presetDeleteOption.classList.add('context-item')
        let deleteIcon = document.createElement('i');
        deleteIcon.classList.add('fas','fa-trash');
        presetDeleteOption.innerHTML=deleteIcon.outerHTML+"Delete";
        presetDeleteOption.addEventListener('click',function(ev){
            ev.stopPropagation();
            closeContextMenu()
            let preset = Settings.getPresets()[parent.getAttribute('data-npreset-id')]
            new Dialog({
                title: "Delete Preset",
                content: "<p>Are you sure you want to delete the preset <strong>"+preset.titleText+"?</strong></p>"
                        +"<p><i>Navigation items in these presets will be moved to the Default preset</i></p>",
                buttons: {
                    yes: {
                        icon: '<i class="fas fa-check"></i>',
                        label: "Yes",
                        callback: () => deletePreset(preset._id)
                    },
                    no: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "No"
                    }
                }
            }).render(true);
        })
        presetContextMenuList.appendChild(presetDeleteOption);
    }
    
    
    presetContextMenu.appendChild(presetContextMenuList);
    
    document.addEventListener('click',function(ev){
        ev.stopPropagation();
        if (ev.target!=parent){
            closeContextMenu()
        }
    });
    presetEditOption.addEventListener('click',function(ev){
        ev.stopPropagation()
        //showEditDialog(parent.getAttribute('data-npreset-id'));
        let newFolder = new NavigationPreset('Default','');
        let preset = Settings.getPresets()[parent.getAttribute('data-npreset-id')]
        newFolder.initFromExisting(preset);
        new NavigationPresetEditConfig(newFolder).render(true);
        closeContextMenu()
    })
    
    parent.insertAdjacentElement('afterBegin',presetContextMenu);
}
function closeContextMenu(){
    let contextMenu = document.querySelector('nav#preset-context-menu');
    if (contextMenu!=null)
        contextMenu.parentNode.removeChild(contextMenu);
}
function addEventListeners(){
    let dropdown = document.querySelector('a.scene-presets')
    dropdown.addEventListener('click',function(ev){
        ev.stopPropagation();
        let menu = document.querySelector('#navpresets-menu')
        if (menu.style.display=='none'){
            let caretIcon = dropdown.querySelector('i.fa-caret-right')
            caretIcon.classList.add('fa-caret-down')
            caretIcon.classList.remove('fa-caret-right')
            menu.style.display='';
        }else{
            let caretIcon = dropdown.querySelector('i.fa-caret-down')
            caretIcon.classList.add('fa-caret-right')
            caretIcon.classList.remove('fa-caret-down')
            menu.style.display='none';
        }
    });
    if (game.user.isGM){
        dropdown.addEventListener('contextmenu',function(ev){
            ev.stopPropagation();
            ev.preventDefault();
            createContextMenu(dropdown);   
        });
    }
    let otherPresets = document.querySelectorAll('li.nav-preset');
    for (let preset of otherPresets){
        preset.addEventListener('click',async function(ev){
            ev.stopPropagation();
            if (!isEventRightClick(ev)){
                await Settings.activatePreset(preset.getAttribute('data-npreset-id'));
                refreshPresets();
            }
        });
        if (game.user.isGM){
            preset.addEventListener('contextmenu',function(ev){
                ev.stopPropagation();
                ev.preventDefault();
                createContextMenu(preset);
            });
        }
    }
    
}
class NavigationPresetEditConfig extends FormApplication {
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = "navigation-preset-edit";
        options.template = "modules/navigation-presets/templates/navigation-preset-edit.html";
        options.width = 500;
        return options;
    }
  
    get title() {
        if ( this.object.colorText.length>1  ) {
            return `Update Preset: ${this.object.titleText}`;
        }
        return "Create Preset";
    }

    getGroupedPacks(){
        let allPresets = game.settings.get(mod,'npresets');
        let assigned = {};
        let unassigned = {};
        let visibleNavIcons = getVisibleNavIds();
        Object.keys(allPresets).forEach(function(key){
            if (key != 'default'){
                for (let a of allPresets[key].sceneList){
                    if (visibleNavIcons.includes(a)){
                        assigned[a]=game.scenes.get(a);
                    }
                }
            }
        });
        for (let scene of visibleNavIcons){
            if (!Object.keys(assigned).includes(scene)){
                unassigned[scene] = game.scenes.get(scene);
            }
        }
        return [assigned,unassigned];

    }
    /** @override */
    async getData(options) {
      let allScenes = this.getGroupedPacks();
      return {
        preset: this.object,
        defaultFolder:this.object._id==='default',
        ascenes: alphaSortScenes(Object.values(allScenes[0])),
        uscenes: alphaSortScenes(Object.values(allScenes[1])),
        submitText: this.object.colorText.length>1   ? "Update Preset" : "Create Preset",
        deleteText: (this.object.colorText.length>1 && this.object._id != 'default') ?"Delete Preset":null
      }
    }
  
    /** @override */
    async _updateObject(event, formData) {
        this.object.titleText = formData.name;
        if (formData.color.length===0){
            this.object.colorText = '#000000'; 
        }else{
            this.object.colorText = formData.color;
        }       

        // Update scene assignment
        let scenesToAdd = []
        let scenesToRemove = []
        for (let sceneKey of game.scenes.keys()){
            if (formData[sceneKey] && !this.object.sceneList.includes(sceneKey)){
                // Box ticked AND scene not in folder
                scenesToAdd.push(sceneKey);
            
            }else if (!formData[sceneKey] && this.object.sceneList.includes(sceneKey)){
                // Box unticked AND scene in folder
                scenesToRemove.push(sceneKey);
            }
        }
        if (formData.delete != null && formData.delete[0]==1){
            //do delete stuff
            new Dialog({
                title: "Delete Preset",
                content: "<p>Are you sure you want to delete the preset <strong>"+this.object.titleText+"?</strong></p>"
                        +"<p><i>Navigation items in these presets will be moved to the Default preset</i></p>",
                buttons: {
                    yes: {
                        icon: '<i class="fas fa-check"></i>',
                        label: "Yes",
                        callback: () => deletePreset(this.object._id)
                    },
                    no: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "No"
                    }
                }
            }).render(true);
        
        }else{
            await updatePresets(scenesToAdd,scenesToRemove,this.object);
        }
    }
}

function refreshPresets(){  
    setupPresets();
    addEventListeners();
}

async function updatePresets(scenesToAdd,scenesToRemove,preset){
    let presetId = preset._id;
    let allPresets = Settings.getPresets();
    if (allPresets[presetId] == null){
        allPresets[presetId]=preset;
    }
    let scenesMoved=[]
    for (let sceneKey of scenesToAdd){
        Object.keys(allPresets).forEach(function(sId){
            if (allPresets[sId].sceneList.includes(sceneKey)){
                allPresets[sId].sceneList.splice(allPresets[sId].sceneList.indexOf(sceneKey),1);
                console.log(modName+' | Removing '+sceneKey+' from preset '+allPresets[sId].titleText);
                if (sId != 'hidden'){
                    scenesMoved.push(sceneKey);
                }
            }
        });
        
        allPresets[presetId].sceneList.push(sceneKey);
        console.log(modName+' | Adding '+sceneKey+' to preset '+preset.titleText);
    }
    if (scenesMoved.length>0){
        ui.notifications.notify("Removing "+scenesMoved.length+" scene"+(scenesMoved.length>1?"s from other presets":" from another preset"))
    }
    if (scenesToRemove.length>0){
        ui.notifications.notify("Adding "+scenesToRemove.length+" scene"+(scenesToRemove.length>1?"s":"")+" to default preset");
    }
    for (let sceneKey of scenesToRemove){
        allPresets[presetId].sceneList.splice(allPresets[presetId].sceneList.indexOf(sceneKey),1);
        allPresets['default'].sceneList.push(sceneKey);
        console.log(modName+' | Adding '+sceneKey+' to preset '+allPresets['default'].titleText);
    }
    allPresets[presetId].titleText = preset.titleText;
    allPresets[presetId].colorText = preset.colorText;

    await game.settings.set(mod,'npresets',allPresets);
    refreshPresets()
}
async function deletePreset(presetId){
    let allPresets = Settings.getPresets();
    for (let scene of allPresets[presetId].sceneList){
        allPresets['default'].sceneList.push(scene);
    }
    delete allPresets[presetId];
    await game.settings.set(mod,'npresets',allPresets);
    refreshPresets();
}
//TODO scene import gui:
// game.folders.entries.filter(function(e){return e.type==='Scene'}) all scene folders
// folder.entities = scenes
export class Settings{
    static registerSettings(){
        game.settings.register(mod, 'npresets', {
            scope: 'world',
            config: false,
            type: Object,
            default:{}
        });     
        game.settings.register(mod,'active-preset',{
            scope:'client',
            config:false,
            type:String,
            default:null
        });
        game.settings.register(mod,'player-enabled',{
            scope:'world',
            config:true,
            type:Boolean,
            default:false,
            name: "Enable presets for players",
            hint: "Players will see the presets and will be able to open/close them, but wont be able to create, edit or delete them"
        });
        game.settings.register(mod,'truncate-name',{
            scope:'world',
            config:true,
            type:Boolean,
            default:true,
            name:'Truncate Scene Names',
            hint: 'If disabled, scene name will not be truncated to 32 characters'
        })
    }
    static updatePreset(presetData){
        let existingPresets = game.settings.get(mod,'npresets');
        existingPresets[presetData._id]=presetData;
        game.settings.set(mod,'npresets',existingPresets);
    }
    static updatePresets(presets){
        game.settings.set(mod,'npresets',presets);
    }
    static getPresets(){
        let allPresets = game.settings.get(mod,'npresets');
        if (game.user.isGM){
            return allPresets;
        } else {
            return Object.keys(allPresets).filter(
                x => allPresets[x].sceneList.some(
                    y => game.scenes.get(y)?.data.permission.default != 0 
                    || game.scenes.get(y)?.active
                )
            ).reduce((obj,key) => {
                obj[key]=allPresets[key];
                return obj},{});
        }
    }
    static getActivePresetId(){
        let result = game.settings.get(mod,'active-preset');
        return result ? result : Object.keys(Settings.getPresets())[0];
    }
    static async activatePreset(newPresetId){
        await game.settings.set(mod,'active-preset',newPresetId);
    }
    static async checkActivePresetExists(){
        let allPresets = Settings.getPresets();
        let activePreset = game.settings.get(mod,'active-preset');
        if (!Object.keys(allPresets).includes(activePreset)){
            console.log(modName+' | Active preset not longer exists, switching to default')
            await game.settings.set(mod,'active-preset',Object.keys(Settings.getPresets())[0]);
        }
    }
}

class SceneNavigationPresets extends SceneNavigation{
    constructor(...args){
        super(args);
    }
      /** @override */
	getData(options) {
        let truncateName = game.settings.get(mod,'truncate-name');
        // Modify Scene data
        const scenes = this.scenes.map(scene => {
            let data = scene.data.toObject(false);
            let users = game.users.filter(u => u.active && (u.viewedScene === scene.id));
            if(!truncateName)
                data.name = data.navName || data.name;
            else
                data.name = TextEditor.truncateText(data.navName || data.name, {maxLength: 32});
            data.users = users.map(u => { return {letter: u.name[0], color: u.data.color} });
            data.visible = (game.user.isGM || scene.isOwner || scene.active);
            data.css = [
            scene.isView ? "view" : null,
            scene.active ? "active" : null,
            data.permission.default === 0 ? "gm" : null
        ].filter(c => !!c).join(" ");
            return data;
        });
        return {
            collapsed: this._collapsed,
            scenes: scenes
          }
    }
}

Hooks.once('init',async function(){
    
    Hooks.on('setup',async function(){
        CONFIG.ui.nav = SceneNavigationPresets;
    })
    Settings.registerSettings();
    Hooks.on('renderSceneNavigation',function(){
        Hooks.call('renderSceneNavigationPresets');
    })
    
    Hooks.on('renderSceneNavigationPresets', async function() {
        if (game.user.isGM || game.settings.get(mod,'player-enabled')){
            if (Object.keys(Settings.getPresets()).length===0){
                await initPresets();
            }
            setupPresets();
            addEventListeners();
        }
    });
    
});