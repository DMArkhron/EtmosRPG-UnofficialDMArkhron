const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;
function maxComplexity(mente) { return mente >= 6 ? "Milagre" : mente >= 4 ? "Complexa" : mente >= 2 ? "Difícil" : "Regular"; }
function fatigueState(value, maximum) {
  const excess = Math.max(0, Number(value || 0) - Number(maximum || 0));
  return {excess,label:excess>=9?'Esgotado':excess>=6?'Exausto':excess>=5?'Cansado':excess>0?`Fadiga ${excess}`:'Sem fadiga',description:excess>=9?'Magias não triviais exigem teste de Corpo +3; falha pode ser fatal.':excess>=6?'Magias não triviais exigem teste de Corpo +4.':excess>=5?'Ferimentos sofridos aumentam em 1.':excess>0?'Estresse acima do limite; o estado Cansado começa em 5 pontos excedentes.':'Sem Estresse acima do limite.'};
}
function resourceLimit(resource, base) {
  const calculated = base + Number(resource?.bonus || 0);
  return resource?.mode === 'manual' ? Number(resource.manualMax ?? calculated) : calculated;
}
function originBonus(actor, name) {
  return actor.items.some(item => item.type === 'origem' && item.name === name);
}
class EtmosActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();
    const s = this.system;
    if (!s?.atributos) return;
    s.estresse.max = resourceLimit(s.estresse, 4 + Number(s.atributos.alma || 0) + (originBonus(this, 'Espírito Forte') ? 2 : 0));
    s.ferimentos.max = resourceLimit(s.ferimentos, 4 + Math.floor(Number(s.atributos.corpo || 0) / 2) + (originBonus(this, 'Atleta') ? 1 : 0));
    s.fadiga = fatigueState(s.estresse.value, s.estresse.max).excess;
  }
}
const ETMOS_ITEM_TITLES = {particula:'Partícula mágica',habilidade:'Habilidade',origem:'Característica de Origem',equipamento:'Equipamento'};
const ETMOS_PARTICLE_LABELS = {funcao:'Função',objeto:'Objeto',caracteristica:'Característica',complemento:'Complemento'};
class EtmosItemSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    tag:'form',classes:['etmos-item-sheet'],position:{width:570,height:620},window:{resizable:true},
    form:{handler:EtmosItemSheet.submit,submitOnChange:true}
  };
  static PARTS = {body:{template:'systems/etmos/templates/item.hbs'}};
  get title(){return `${this.document.name} · ETMOS`;}
  async _prepareContext(options){
    const context=await super._prepareContext(options);
    const item=this.document;
    const system=foundry.utils.deepClone(item.system.toObject?.() ?? item.system);
    context.item=item;context.system=system;context.editable=this.isEditable;
    context.particle=item.type==='particula';context.skill=item.type==='habilidade';context.origin=item.type==='origem';context.equipment=item.type==='equipamento';
    context.kind=ETMOS_ITEM_TITLES[item.type] || 'Item';
    context.particleCategory=ETMOS_PARTICLE_LABELS[system.categoria] || system.categoria || '';
    for(const category of Object.keys(ETMOS_PARTICLE_LABELS))context[`cat_${category}`]=system.categoria===category;
    context.description=String(system.descricao || '').trim();
    return context;
  }
  static async submit(event,form,formData){
    if(!this.isEditable)return;
    await this.document.update(foundry.utils.expandObject(formData.object));
  }
  async _preClose(options){
    if(this.isEditable && this.element?.isConnected)await this.submit();
    return super._preClose(options);
  }
}

class EtmosSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = { tag: 'form', classes: ['etmos-sheet'], position: { width: 760, height: 760 }, window: { resizable: true }, form: { handler: EtmosSheet.submit, submitOnChange: true }, dragDrop: [{ dragSelector: null, dropSelector: '.etmos' }], actions: { roll: EtmosSheet.roll, remove: EtmosSheet.remove, viewImage: EtmosSheet.viewImage, cast: EtmosSheet.cast, switchEtmosTab: EtmosSheet.switchEtmosTab, switchEtmosSubtab: EtmosSheet.switchEtmosSubtab, shareOrigin: EtmosSheet.shareOrigin, shareSkill: EtmosSheet.shareSkill, saveOrigin: EtmosSheet.saveOrigin, levelUp: EtmosSheet.levelUp, toggleMilestone: EtmosSheet.toggleMilestone, claimBonus: EtmosSheet.claimBonus } };
  static PARTS = { body: { template: 'systems/etmos/templates/actor.hbs' } };
  activeTab = 'ficha';
  activeSubtab = 'origem';
  get title() { return this.document.name; }
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.document;
    const system = foundry.utils.deepClone(this.document.system.toObject?.() ?? this.document.system);
    system.estresse.max = resourceLimit(system.estresse, 4 + Number(system.atributos.alma || 0) + (originBonus(this.document, 'Espírito Forte') ? 2 : 0));
    system.ferimentos.max = resourceLimit(system.ferimentos, 4 + Math.floor(Number(system.atributos.corpo || 0) / 2) + (originBonus(this.document, 'Atleta') ? 1 : 0));
    for (const resource of [system.estresse, system.ferimentos]) { resource.isAuto = resource.mode !== "manual"; resource.isManual = resource.mode === "manual"; }
    context.system = system;
    context.editable = this.isEditable;
    context.fichaActive = this.activeTab === 'ficha';
    context.featuresActive = this.activeTab === 'caracteristicas';
    context.milestonesActive = this.activeTab === 'marcos';
    context.conceptActive = this.activeTab === 'conceito';
    context.nextLevel = Math.min(6, Number(system.nivel || 1) + 1);
    context.canLevelUp = Number(system.nivel || 1) < 6 && ['fisico','mental','emocional'].every(key => Boolean(system.marcos?.[key]?.bonus) && Math.min(5,Math.max(Number(system.marcos?.[key]?.marcos || 0),Number(system.marcos?.[key]?.pontos || 0))) >= 5);
    context.originActive = this.activeSubtab === 'origem';
    context.practicalActive = this.activeSubtab === 'pratica';
    context.theoreticalActive = this.activeSubtab === 'teorica';
    context.complexity = maxComplexity(Number(system.atributos.mente || 0));
    const mind = Number(system.atributos.mente || 0);
    context.complexitySteps = [{label:'Trivial',min:0,requirement:'Sempre'},{label:'Regular',min:0,requirement:'Sempre'},{label:'Difícil',min:2,requirement:'Mente 2'},{label:'Complexa',min:4,requirement:'Mente 4'},{label:'Milagre',min:6,requirement:'Mente 6'}].map(step => ({...step,unlocked:mind >= step.min}));
    context.fatigue = fatigueState(system.estresse.value, system.estresse.max);
    context.conceptFields = [['valores','Valores','O que é importante para o personagem?'],['comportamentos','Comportamentos','Como costuma agir?'],['futuro','Futuro','Quais são seus planos?'],['importancia','Pontos de Importância','Pessoas, lugares e causas'],['aparencia','Aparência','Como é visto?'],['historia','História/Background','De onde vem?']].map(([key,label,hint]) => ({key,label,hint,value:system.conceito?.[key] ?? ''}));
    context.attributes = ['corpo','mente','alma'].map(key => ({key,label:key[0].toUpperCase()+key.slice(1),value:system.atributos[key],hint:{corpo:'Resistência e Ferimentos',mente:'Intelecto e Complexidade',alma:'Estresse e influência'}[key]}));
    context.milestones = ['fisico','mental','emocional'].map(key => {
      const record=system.marcos?.[key] || {};
      const count=Math.min(5,Math.max(Number(record.marcos || 0),Number(record.pontos || 0)));
      return {key,label:{fisico:'Físico',mental:'Mental',emocional:'Emocional'}[key],count,boxes:Array.from({length:5},(_,index)=>({index,number:index+1,checked:index<count,locked:index>count})),notas:record.notas ?? '',bonus:ETMOS_PROGRESS[Number(system.nivel || 1)]?.find(plan=>plan.id===record.bonus)?.label ?? record.bonus ?? '',ready:count===5 && !record.bonus};
    });
    context.origins = this.document.items.filter(item => item.type === 'origem');
    context.skills = this.document.items.filter(item => item.type === 'habilidade');
    context.practicalSkills = context.skills.filter(item => String(item.system.tipo).toLowerCase().includes('prática'));
    context.theoreticalSkills = context.skills.filter(item => String(item.system.tipo).toLowerCase().includes('teórica'));
    context.groups = ['funcao','objeto','caracteristica','complemento'].map(key => ({ key, label: {funcao:'Funções',objeto:'Objetos',caracteristica:'Características',complemento:'Complementos'}[key], items: this.document.items.filter(i => i.type === 'particula' && i.system.categoria === key) }));
    return context;
  }
  static async submit(event, form, formData) {
    const changes = foundry.utils.expandObject(formData.object);
    const current = this.document.system;
    if (changes.system?.nivel !== undefined) {
      const level = Number(changes.system.nivel);
      if (!Number.isInteger(level) || level < 1 || level > 6) {
        ui.notifications.warn('O nível deve ser um número inteiro de 1 a 6.');
        return;
      }
    }
    const attr = changes.system?.atributos ?? {};
    const resources = changes.system ?? {};
    const stress = { ...current.estresse, ...resources.estresse };
    const wounds = { ...current.ferimentos, ...resources.ferimentos };
    changes.system ??= {};
    changes.system.estresse = { ...resources.estresse, max: resourceLimit(stress, 4 + Number(attr.alma ?? current.atributos.alma ?? 0) + (originBonus(this.document, 'Espírito Forte') ? 2 : 0)) };
    changes.system.ferimentos = { ...resources.ferimentos, max: resourceLimit(wounds, 4 + Math.floor(Number(attr.corpo ?? current.atributos.corpo ?? 0) / 2) + (originBonus(this.document, 'Atleta') ? 1 : 0)) };
    changes.system.fadiga = fatigueState(changes.system.estresse.value ?? current.estresse.value, changes.system.estresse.max).excess;
    await this.document.update(changes);
  }
  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    const refresh = () => {
      const value = root.querySelector('[name="system.estresse.value"]')?.value ?? this.document.system.estresse.value;
      const soul = Number(root.querySelector('[name="system.atributos.alma"]')?.value ?? this.document.system.atributos.alma);
      const mode = root.querySelector('[name="system.estresse.mode"]')?.value ?? this.document.system.estresse.mode;
      const bonus = Number(root.querySelector('[name="system.estresse.bonus"]')?.value ?? this.document.system.estresse.bonus);
      const manualMax = Number(root.querySelector('[name="system.estresse.manualMax"]')?.value ?? this.document.system.estresse.manualMax);
      const maximum = resourceLimit({mode,bonus,manualMax}, 4 + soul + (originBonus(this.document, 'Espírito Forte') ? 2 : 0));
      const fatigue = fatigueState(value, maximum);
      const card = root.querySelector('[data-fatigue-card]');
      if (!card) return;
      card.querySelector('[data-fatigue-label]').textContent = fatigue.label;
      card.querySelector('[data-fatigue-description]').textContent = fatigue.description;
      card.querySelector('[data-fatigue-excess]').textContent = fatigue.excess;
      const maximumLabel = root.querySelector('.etmos-resource-stress .etmos-resource-head strong');
      if (maximumLabel) maximumLabel.textContent = `${value || 0} / ${maximum}`;
    };
    root.addEventListener('input',refresh); root.addEventListener('change',refresh);
    root.querySelector('.etmos-portrait')?.addEventListener('contextmenu',event=>{
      event.preventDefault();
      if (this.isEditable) EtmosSheet.changeImage.call(this,event,event.currentTarget);
    });
  }
  async _preClose(options) {
    if (this.isEditable && this.element?.isConnected) await this.submit();
    return super._preClose(options);
  }
  static async roll(event, button) {
    const key = button.dataset.attribute;
    new EtmosRollDialog({ actor:this.document, attribute:key }).render(true);
  }
  static cast(event, button) { new EtmosConjuration({ actor: this.document }).render(true); }
  static async switchEtmosTab(event, button) {
    const tab = button.dataset.tab;
    if (!['ficha', 'caracteristicas', 'conceito', 'marcos'].includes(tab) || tab === this.activeTab) return;
    this.activeTab = tab;
    const root = this.element;
    for (const section of root.querySelectorAll('[data-etmos-panel]')) section.hidden = section.dataset.etmosPanel !== tab;
    for (const control of root.querySelectorAll('[data-action="switchEtmosTab"]')) {
      const active = control.dataset.tab === tab;
      control.classList.toggle('active', active);
      control.setAttribute('aria-selected', String(active));
    }
  }
  static switchEtmosSubtab(event, button) {
    const tab = button.dataset.subtab;
    if (!["origem", "pratica", "teorica"].includes(tab)) return;
    this.activeSubtab = tab;
    for (const section of this.element.querySelectorAll("[data-etmos-subpanel]")) section.hidden = section.dataset.etmosSubpanel !== tab;
    for (const control of this.element.querySelectorAll("[data-action='switchEtmosSubtab']")) { control.classList.toggle("active", control.dataset.subtab === tab); control.setAttribute("aria-selected", String(control.dataset.subtab === tab)); }
  }
  async _onDropItem(event, item) {
    const dropped = await super._onDropItem(event, item);
    if (dropped?.type === 'origem' || dropped?.type === 'habilidade') {
      this.activeTab = 'caracteristicas';
      this.activeSubtab = dropped.type === 'origem' ? 'origem' : String(dropped.system.tipo).toLowerCase().includes('teórica') ? 'teorica' : 'pratica';
      await this.render();
    }
    return dropped;
  }
  static async toggleMilestone(event, button) {
    if (!this.isEditable) return;
    const key=button.dataset.category, record=this.document.system.marcos?.[key];
    const index=Number(button.dataset.index);
    if (!['fisico','mental','emocional'].includes(key) || !record || record.bonus || !Number.isInteger(index) || index<0 || index>4) return;
    const before=Math.min(5,Math.max(Number(record.marcos || 0),Number(record.pontos || 0)));
    if(index>before) return;
    const count=index<before?index:before+1;
    await this.document.update({[`system.marcos.${key}.marcos`]:count,[`system.marcos.${key}.pontos`]:0});
  }
  static claimBonus(event, button) {
    if (!this.isEditable) return;
    const key=button.dataset.category;
    if (['fisico','mental','emocional'].includes(key)) new EtmosAdvancement({actor:this.document, category:key}).render(true);
  }
  static levelUp(event, button) {
    if (!this.isEditable) return;
    const actor=this.document;
    if (Number(actor.system.nivel)>=6 || !['fisico','mental','emocional'].every(key=>actor.system.marcos?.[key]?.bonus && Math.max(Number(actor.system.marcos?.[key]?.marcos || 0),Number(actor.system.marcos?.[key]?.pontos || 0))>=5)) {
      ui.notifications.warn('Complete as três categorias e receba os bônus antes de subir de nível.');return;
    }
    new EtmosLevelChoice({actor}).render(true);
  }
  static async shareOrigin(event, button) {
    const item = this.document.items.get(button.dataset.id);
    if (!item || item.type !== 'origem') return;
    const safe = value => foundry.utils.escapeHTML(String(value ?? ''));
    const content = `<div class="etmos-origin-chat"><header><img src="systems/etmos/assets/origem.svg" alt=""><span>CARACTERÍSTICA DE ORIGEM</span></header><h3>${safe(item.name)}</h3><p class="etmos-origin-tags">${safe(item.system.mundo)}${item.system.exclusivo ? ' · Exclusiva' : ''}</p><p>${safe(item.system.descricao)}</p>${item.system.detalhe ? `<p><strong>Escolha:</strong> ${safe(item.system.detalhe)}</p>` : ''}</div>`;
    await ChatMessage.create({ speaker:ChatMessage.getSpeaker({actor:this.document}), content, flags:{etmos:{originItemId:item.id}} });
  }
  static async shareSkill(event, button) {
    const item = this.document.items.get(button.dataset.id);
    if (!item || item.type !== 'habilidade') return;
    const safe = value => foundry.utils.escapeHTML(String(value ?? ''));
    await ChatMessage.create({ speaker:ChatMessage.getSpeaker({actor:this.document}), content:`<div class="etmos-origin-chat"><header><img src="systems/etmos/assets/habilidade.svg" alt=""><span>HABILIDADE ${safe(item.system.tipo)}</span></header><h3>${safe(item.name)}</h3><p>${safe(item.system.descricao)}</p>${Number(item.system.bonus) ? `<p><strong>Bônus contextual:</strong> +${Number(item.system.bonus)}</p>` : ''}</div>` });
  }
  static async saveOrigin(event, button) {
    if (!this.isEditable) return;
    const item = this.document.items.get(button.dataset.id);
    if (!item || item.type !== 'origem') return;
    const detail = button.closest('.etmos-origin-card')?.querySelector('.etmos-origin-choice input')?.value ?? '';
    await item.update({ 'system.detalhe':detail.trim() });
  }
  static viewImage(event, button) {
    new foundry.applications.apps.ImagePopout({src:this.document.img,uuid:this.document.uuid,window:{title:this.document.name}}).render(true);
  }
  static async changeImage(event, button) {
    const picker = new foundry.applications.apps.FilePicker({type:'image',current:this.document.img,callback:path=>this.document.update({img:path})});
    await picker.browse();
  }
  static async remove(event, button) { await this.document.deleteEmbeddedDocuments('Item', [button.dataset.id]); }

}

const LABELS = { funcao:'Funções', objeto:'Objetos', caracteristica:'Características', complemento:'Complementos' };
const CREATOR_CODES = new Set(['Ag', 'Mut', 'Ada', 'No']);
const escapeHTML = value => foundry.utils.escapeHTML(String(value ?? ''));

const STACKABLE_SKILLS = new Set(['Aparar','Armas Brancas','Armas de Longo Alcance','Diplomacia','Direção e Montaria','Enganar','Ladinagem','Performance','Perspicácia','Sobrevivência','Conhecimento em…','Magia Entre Nós','Medicina','Mecânica e Engenharia','Zoologia']);
class EtmosRollDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
    this.attribute = options.attribute;
  }
  static DEFAULT_OPTIONS = { classes:['etmos-roll'], position:{width:520,height:570}, window:{resizable:true}, actions:{roll:EtmosRollDialog.roll} };
  static PARTS = { body:{template:'systems/etmos/templates/roll.hbs'} };
  get title() { return `Teste de ${this.attribute} — ${this.actor.name}`; }
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.actor;
    context.attribute = this.attribute;
    context.value = Number(this.actor.system.atributos[this.attribute] || 0);
    const skills = this.actor.items.filter(item => item.type === 'habilidade');
    context.skills = skills.filter((item, index) => !STACKABLE_SKILLS.has(item.name) || skills.findIndex(other => other.name === item.name) === index).map(item => {
      const copies = STACKABLE_SKILLS.has(item.name) ? skills.filter(other => other.name === item.name) : [item];
      return {id:item.id, name:item.name, bonus:copies.reduce((sum, entry) => sum + Number(entry.system.bonus || 0), 0), count:copies.length, repeated:copies.length > 1};
    });
    return context;
  }
  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    const updatePreview = () => {
      const id = root.querySelector('[name="skill"]')?.value || '';
      const skill = id ? this.actor.items.get(id) : null;
      const modifier = Number(root.querySelector('[name="modifier"]')?.value || 0);
      const matching = skill && STACKABLE_SKILLS.has(skill.name) ? this.actor.items.filter(item => item.type === 'habilidade' && item.name === skill.name) : (skill ? [skill] : []);
      const attributeBonus = Number(this.actor.system.atributos[this.attribute] || 0);
      const bonus = attributeBonus + matching.reduce((sum, item) => sum + Number(item.system.bonus || 0), 0);
      const label = root.querySelector('[data-roll-choice]');
      const formula = root.querySelector('[data-roll-formula]');
      if (label) label.textContent = skill ? `Atributo ${this.attribute} + ${skill.name}` : `Atributo · ${this.attribute}`;
      if (formula) formula.textContent = `2d6 ${bonus + (Number.isFinite(modifier) ? modifier : 0) < 0 ? '−' : '+'} ${Math.abs(bonus + (Number.isFinite(modifier) ? modifier : 0))}`;
    };
    root.querySelector('[name="skill"]')?.addEventListener('change', updatePreview);
    root.querySelector('[name="modifier"]')?.addEventListener('input', updatePreview);
    updatePreview();
  }
  static async roll(event, button) {
    const root = this.element;
    const skillId = root.querySelector('[name="skill"]')?.value || '';
    const modifier = Number(root.querySelector('[name="modifier"]')?.value || 0);
    if (!Number.isFinite(modifier) || Math.abs(modifier) > 100) { ui.notifications.warn('Informe um modificador numérico válido.'); return; }
    const skill = skillId ? this.actor.items.get(skillId) : null;
    if (skillId && skill?.type !== 'habilidade') { ui.notifications.warn('A habilidade escolhida não está na ficha.'); return; }
    // ETMOS: teste de Atributo usa o atributo; teste de Habilidade usa o bônus da habilidade.
    const matching = skill && STACKABLE_SKILLS.has(skill.name) ? this.actor.items.filter(item => item.type === 'habilidade' && item.name === skill.name) : (skill ? [skill] : []);
    const attributeBonus = Number(this.actor.system.atributos[this.attribute] || 0);
    const skillBonus = matching.reduce((sum, item) => sum + Number(item.system.bonus || 0), 0);
    const bonus = attributeBonus + skillBonus;
    const total = bonus + modifier;
    const signed = n => `${n < 0 ? '−' : '+'}${Math.abs(n)}`;
    const roll = await new Roll(`2d6 ${total < 0 ? '-' : '+'} ${Math.abs(total)}`).evaluate();
    const results = roll.dice.flatMap(die => die.results.filter(result => result.active !== false).map(result => Number(result.result)));
    const dice = results.map((value, index) => `<span class="etmos-test-die"><small>D${index + 1}</small><strong>${value}</strong></span>`).join('');
    const label = skill ? `${this.attribute} + ${skill.name}` : this.attribute;
    const type = 'ATRIBUTO';
    const tone = skill ? 'skill' : 'attribute';
    const breakdown = skill && matching.length > 1 ? `<div class="etmos-test-copies">${matching.length} escolhas de ${escapeHTML(skill.name)}: ${matching.map(item => signed(Number(item.system.bonus || 0))).join(' + ')}</div>` : '';
    const content = `<div class="etmos-test-card etmos-test-${tone}"><div class="etmos-test-heading"><span class="etmos-test-symbol">✦</span><span>TESTE DE ${type}</span></div><div class="etmos-test-main"><span class="etmos-test-label">${escapeHTML(label)}</span><span class="etmos-test-formula">2d6 ${signed(total)}</span></div><div class="etmos-test-breakdown"><div class="etmos-test-row"><span>Dados (2d6)</span><div class="etmos-test-dice">${dice}</div></div><div class="etmos-test-row"><span>Atributo ${escapeHTML(this.attribute)}</span><strong>${signed(attributeBonus)}</strong></div>${skill ? `<div class="etmos-test-row"><span>Habilidade ${escapeHTML(skill.name)}</span><strong>${signed(skillBonus)}</strong></div>` : ''}${breakdown}${modifier ? `<div class="etmos-test-row"><span>Modificador circunstancial</span><strong>${signed(modifier)}</strong></div>` : ''}</div><div class="etmos-test-result"><span>RESULTADO FINAL</span><strong>${Number(roll.total)}</strong></div></div>`;
    // toMessage prepara o modo público, privado ou secreto configurado pelo Foundry.
    const message = await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:this.actor})}, {create:false});
    message.content = content;
    await ChatMessage.create(message);
    await this.close();
  }
}

class EtmosConjuration extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
    this.functionId = null;
    this.objectId = null;
    this.sequence = [];
    this.intention = '';
  }
  static DEFAULT_OPTIONS = {
    classes: ['etmos-cast'],
    position: { width: 760, height: 780 },
    window: { resizable: true, title: 'Conjurar frase mágica' },
    actions: { choose: EtmosConjuration.choose, remove: EtmosConjuration.remove, send: EtmosConjuration.send }
  };
  static PARTS = { body: { template: 'systems/etmos/templates/conjuration.hbs' } };
  get title() { return `Conjurar — ${this.actor.name}`; }
  get known() { return this.actor.items.filter(item => item.type === 'particula'); }
  _rememberIntention() { this.intention = this.element?.querySelector('[name="intention"]')?.value ?? this.intention; }
  _item(id, category) {
    const item = this.actor.items.get(id);
    return item?.type === 'particula' && item.system.categoria === category ? item : null;
  }
  _compose() {
    const func = this._item(this.functionId, 'funcao');
    const obj = this._item(this.objectId, 'objeto');
    if (!func || !obj) return '';
    const words = [`${func.system.codigo}${String(obj.system.codigo).toLowerCase()}`];
    let prefix = '';
    for (const id of this.sequence) {
      const item = this.actor.items.get(id);
      if (!item || item.type !== 'particula') continue;
      const code = String(item.system.codigo || '');
      if (item.system.categoria === 'complemento' && CREATOR_CODES.has(code)) { prefix += code.toLowerCase(); continue; }
      if (item.system.categoria === 'caracteristica') {
        words.push(prefix ? `${prefix}${code}` : code);
        prefix = '';
      } else if (item.system.categoria === 'complemento') words.push(code);
    }
    return words.join(' ');
  }
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.actor;
    context.function = this._item(this.functionId, 'funcao');
    context.object = this._item(this.objectId, 'objeto');
    context.groups = ['funcao','objeto','caracteristica','complemento'].map(key => ({
      key, label: LABELS[key],
      items: this.known.filter(item => item.system.categoria === key).map(item => ({ id:item.id, name:item.name, code:item.system.codigo, selected: key === 'funcao' ? item.id === this.functionId : key === 'objeto' ? item.id === this.objectId : false }))
    }));
    context.sequence = this.sequence.map((id, index) => ({ item: this.actor.items.get(id), index })).filter(entry => entry.item);
    context.phrase = this._compose();
    context.intention = this.intention;
    return context;
  }
  static async choose(event, button) {
    this._rememberIntention();
    const id = button.dataset.id;
    const item = this.actor.items.get(id);
    if (!item || item.type !== 'particula') return;
    if (item.system.categoria === 'funcao') this.functionId = id;
    else if (item.system.categoria === 'objeto') this.objectId = id;
    else if (['caracteristica','complemento'].includes(item.system.categoria)) this.sequence.push(id);
    await this.render();
  }
  static async remove(event, button) {
    this._rememberIntention();
    this.sequence.splice(Number(button.dataset.index), 1);
    await this.render();
  }
  static async send(event, button) {
    this._rememberIntention();
    if (!this._item(this.functionId, 'funcao') || !this._item(this.objectId, 'objeto')) {
      ui.notifications.warn('Escolha uma Função e um Objeto conhecidos.'); return;
    }
    const selected = this.sequence.map(id => this.actor.items.get(id));
    if (selected.some(item => !item || item.type !== 'particula' || !['caracteristica','complemento'].includes(item.system.categoria))) {
      ui.notifications.warn('Uma das partículas escolhidas não está mais no Grimório.'); return;
    }
    let pendingCreator = false;
    for (const item of selected) {
      if (item.system.categoria === 'complemento' && CREATOR_CODES.has(item.system.codigo)) pendingCreator = true;
      if (item.system.categoria === 'caracteristica') pendingCreator = false;
      if (item.system.categoria === 'complemento' && !CREATOR_CODES.has(item.system.codigo) && pendingCreator) {
        ui.notifications.warn('Coloque uma Característica após Adição, Derivação, Variação ou Negação.'); return;
      }
    }
    if (pendingCreator) { ui.notifications.warn('Um Complemento criador precisa vir antes de uma Característica.'); return; }
    const intention = this.intention.trim();
    if (!intention) { ui.notifications.warn('Descreva a intenção da magia.'); return; }
    const phrase = this._compose();
    const parts = [this._item(this.functionId, 'funcao'), this._item(this.objectId, 'objeto'), ...selected];
    const tokens = parts.map(item => {
      const category = item.system.categoria;
      const label = { funcao:'Função', objeto:'Objeto', caracteristica:'Característica', complemento:'Complemento' }[category];
      return `<span class="etmos-chat-token etmos-token-${category}" title="${label}"><span class="etmos-token-mark">${{funcao:'F',objeto:'O',caracteristica:'C',complemento:'+'}[category]}</span><span class="etmos-token-name">${escapeHTML(item.name)}</span><code>${escapeHTML(item.system.codigo)}</code></span>`;
    }).join('');
    const content = `<div class="etmos-chat"><div class="etmos-chat-heading"><span>✦</span><strong>FRASE MÁGICA</strong></div><p class="etmos-chat-phrase">${escapeHTML(phrase)}</p><div class="etmos-chat-particles">${tokens}</div><div class="etmos-chat-intention"><small>INTENÇÃO</small><p>${escapeHTML(intention).replace(/\n/g, '<br>')}</p></div></div>`;
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({actor:this.actor}), content, flags: { etmos: { conjuration: { phrase, intention, particleIds: parts.map(item => item.id) } } } });
    await this.close();
  }
}

// Each completed development category grants one of the three distinct bonuses for the current level.
const ETMOS_PROGRESS = {
  1:[{id:'lexicon',label:'1 Objeto e 1 Característica',kinds:['objeto','caracteristica']},{id:'attribute',label:'1 ponto de Atributo',kinds:[]},{id:'practical',label:'1 Habilidade Prática',kinds:['pratica']}],
  2:[{id:'function',label:'1 Função',kinds:['funcao']},{id:'attribute',label:'1 ponto de Atributo',kinds:[]},{id:'theoretical',label:'1 Habilidade Teórica',kinds:['teorica']}],
  3:[{id:'lexicon',label:'1 Objeto e 1 Característica',kinds:['objeto','caracteristica']},{id:'attribute',label:'1 ponto de Atributo',kinds:[]},{id:'practical',label:'1 Habilidade Prática',kinds:['pratica']}],
  4:[{id:'function',label:'1 Função',kinds:['funcao']},{id:'attribute',label:'1 ponto de Atributo',kinds:[]},{id:'theoretical',label:'1 Habilidade Teórica',kinds:['teorica']}],
  5:[{id:'lexicon',label:'1 Função, 1 Objeto e 1 Característica',kinds:['funcao','objeto','caracteristica']},{id:'attribute',label:'1 ponto de Atributo',kinds:[]},{id:'skills',label:'1 Habilidade Prática e 1 Teórica',kinds:['pratica','teorica']}]
};
const ETMOS_PACKS = {funcao:'funcao',objeto:'objeto',caracteristica:'caracteristica',pratica:'habilidades-pratica',teorica:'habilidades-teorica'};
const ETMOS_KIND_LABELS = {funcao:'Função',objeto:'Objeto',caracteristica:'Característica',pratica:'Habilidade Prática',teorica:'Habilidade Teórica'};
class EtmosAdvancement extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options={}) { super(options); this.actor=options.actor; this.category=options.category; this.level=Number(this.actor.system.nivel || 1); this.catalog={}; }
  static DEFAULT_OPTIONS={classes:['etmos-advancement'],position:{width:760,height:740},window:{resizable:true},actions:{confirm:EtmosAdvancement.confirm}};
  static PARTS={body:{template:'systems/etmos/templates/advancement.hbs'}};
  get title(){return `Bônus de ${this.category} · ${this.actor.name}`;}
  async _prepareContext(options){
    const context=await super._prepareContext(options);
    const plans=ETMOS_PROGRESS[this.level] || [];
    const claimed=['fisico','mental','emocional'].map(key=>this.actor.system.marcos?.[key]?.bonus).filter(Boolean);
    for(const kind of new Set(plans.flatMap(plan=>plan.kinds))){
      const pack=game.packs.get(`etmos.${ETMOS_PACKS[kind]}`);
      const docs=pack?await pack.getDocuments():[];
      this.catalog[kind]=docs.map(doc=>({uuid:doc.uuid,name:doc.name,code:doc.system.codigo || '',description:doc.system.descricao || ''})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    }
    context.level=this.level;context.category={fisico:'Físico',mental:'Mental',emocional:'Emocional'}[this.category];
    context.bonuses=plans.map(plan=>({id:plan.id,label:plan.label,claimed:claimed.includes(plan.id)}));
    context.attributeOptions=['corpo','mente','alma'].map(key=>({key,label:key[0].toUpperCase()+key.slice(1),value:Number(this.actor.system.atributos[key] || 0)}));
    context.catalog=Object.entries(this.catalog).map(([kind,items])=>({kind,label:ETMOS_KIND_LABELS[kind],items}));
    return context;
  }
  _onRender(context,options){
    super._onRender(context,options);
    const root=this.element;
    const update=()=>{
      const plan=ETMOS_PROGRESS[this.level]?.find(entry=>entry.id===root.querySelector('[data-bonus]')?.value);
      for(const section of root.querySelectorAll('[data-catalog-kind]'))section.hidden=!plan?.kinds.includes(section.dataset.catalogKind);
      root.querySelector('[data-attribute-choice]').hidden=plan?.id!=='attribute';
      for(const select of root.querySelectorAll('[data-pick-kind]')){
        const item=this.catalog[select.dataset.pickKind]?.find(entry=>entry.uuid===select.value);
        const preview=select.closest('.etmos-advancement-pick')?.querySelector('.etmos-advancement-description');
        if(preview)preview.textContent=item?.description || 'Escolha um item para ler sua descrição.';
      }
    };
    root.addEventListener('change',update);update();
  }
  static async confirm(event,button){
    if(this.working)return;
    const record=this.actor.system.marcos?.[this.category];
    if(Number(this.actor.system.nivel)!==this.level || !record || Math.max(Number(record.marcos || 0),Number(record.pontos || 0))<5 || record.bonus){ui.notifications.warn('Este bônus já foi recebido ou a categoria ainda não está completa.');return;}
    const id=this.element.querySelector('[data-bonus]')?.value;
    const plan=ETMOS_PROGRESS[this.level]?.find(entry=>entry.id===id);
    const claimed=['fisico','mental','emocional'].some(key=>this.actor.system.marcos?.[key]?.bonus===id);
    if(!plan || claimed){ui.notifications.warn('Escolha um bônus disponível para este nível.');return;}
    const selected=[];
    for(const kind of plan.kinds){
      const uuid=this.element.querySelector(`[data-pick-kind="${kind}"]`)?.value;
      const item=this.catalog[kind]?.find(entry=>entry.uuid===uuid);
      if(!item){ui.notifications.warn(`Escolha ${ETMOS_KIND_LABELS[kind]}.`);return;}
      if(['funcao','objeto','caracteristica'].includes(kind) && this.actor.items.some(known=>known.type==='particula' && known.system.categoria===kind && known.system.codigo===item.code)){ui.notifications.warn(`${item.name} já está no Grimório.`);return;}
      selected.push(item);
    }
    const attribute=this.element.querySelector('[name="advance-attribute"]')?.value;
    if(id==='attribute' && !['corpo','mente','alma'].includes(attribute)){ui.notifications.warn('Escolha um atributo.');return;}
    this.working=true;button.disabled=true;
    try {
      const documents=await Promise.all(selected.map(item=>fromUuid(item.uuid)));
      if(documents.some(doc=>!doc))throw new Error('Uma opção do compêndio está indisponível.');
      const created=documents.length?await this.actor.createEmbeddedDocuments('Item',documents.map(doc=>{const data=doc.toObject();delete data._id;return data;})):[];
      try{
        const changes={[`system.marcos.${this.category}.bonus`]:id};
        if(id==='attribute')changes[`system.atributos.${attribute}`]=Number(this.actor.system.atributos[attribute] || 0)+1;
        await this.actor.update(changes);
      }catch(error){if(created.length)await this.actor.deleteEmbeddedDocuments('Item',created.map(item=>item.id));throw error;}
      ui.notifications.info(`Bônus de ${this.category} recebido.`);await this.close();
    }catch(error){console.error('ETMOS | Bônus de progressão',error);ui.notifications.error(`Não foi possível aplicar o bônus: ${error.message}`);this.working=false;button.disabled=false;}
  }
}

class EtmosLevelChoice extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options={}) {super(options);this.actor=options.actor;this.level=Number(this.actor.system.nivel || 1);this.catalog={};}
  static DEFAULT_OPTIONS={classes:['etmos-advancement'],position:{width:730,height:610},window:{resizable:true},actions:{confirm:EtmosLevelChoice.confirm}};
  static PARTS={body:{template:'systems/etmos/templates/level-up.hbs'}};
  get title(){return `Subir de nível · ${this.actor.name}`;}
  async _prepareContext(options){
    const context=await super._prepareContext(options);
    for(const kind of ['funcao','objeto']){
      const pack=game.packs.get(`etmos.${kind}`);
      const docs=pack?await pack.getDocuments():[];
      this.catalog[kind]=docs.filter(doc=>!this.actor.items.some(item=>item.type==='particula' && item.system.categoria===kind && item.system.codigo===doc.system.codigo)).map(doc=>({uuid:doc.uuid,name:doc.name,code:doc.system.codigo,description:doc.system.descricao || ''})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    }
    context.level=this.level;context.nextLevel=this.level+1;
    context.catalog=Object.entries(this.catalog).map(([kind,items])=>({kind,label:ETMOS_KIND_LABELS[kind],items}));
    return context;
  }
  _onRender(context,options){
    super._onRender(context,options);
    const root=this.element;
    const update=()=>{for(const select of root.querySelectorAll('[data-pick-kind]')){
      const item=this.catalog[select.dataset.pickKind]?.find(entry=>entry.uuid===select.value);
      select.closest('.etmos-advancement-pick').querySelector('.etmos-advancement-description').textContent=item?.description || 'Escolha para ler a descrição.';
    }};
    root.addEventListener('change',update);update();
  }
  static async confirm(event,button){
    if(this.working)return;
    const actor=this.actor,keys=['fisico','mental','emocional'];
    if(Number(actor.system.nivel)!==this.level || this.level>=6 || !keys.every(key=>actor.system.marcos?.[key]?.bonus && Math.max(Number(actor.system.marcos?.[key]?.marcos || 0),Number(actor.system.marcos?.[key]?.pontos || 0))>=5)){ui.notifications.warn('A progressão mudou; reabra esta janela.');return;}
    const selections=[];
    for(const kind of ['funcao','objeto']){
      const uuid=this.element.querySelector(`[data-pick-kind="${kind}"]`)?.value;
      const item=this.catalog[kind]?.find(entry=>entry.uuid===uuid);
      if(!item || actor.items.some(known=>known.type==='particula' && known.system.categoria===kind && known.system.codigo===item.code)){ui.notifications.warn(`Escolha ${ETMOS_KIND_LABELS[kind]} ainda não conhecida.`);return;}
      selections.push(item);
    }
    const pack=this.level+1<=4?game.packs.get(`etmos.complemento-n${this.level+1}`):null;
    if(this.level+1<=4 && !pack){ui.notifications.error('Compêndio de Complementos indisponível.');return;}
    this.working=true;button.disabled=true;
    try{
      const docs=await Promise.all(selections.map(item=>fromUuid(item.uuid)));
      if(docs.some(doc=>!doc))throw new Error('Partícula indisponível.');
      const complements=pack?await pack.getDocuments():[];
      const missing=complements.filter(doc=>!actor.items.some(item=>item.type==='particula' && item.system.categoria==='complemento' && item.system.codigo===doc.system.codigo));
      const created=await actor.createEmbeddedDocuments('Item',[...docs,...missing].map(doc=>{const data=doc.toObject();delete data._id;return data;}));
      try{
        const changes={'system.nivel':this.level+1};
        for(const key of keys){changes[`system.marcos.${key}.marcos`]=0;changes[`system.marcos.${key}.pontos`]=0;changes[`system.marcos.${key}.bonus`]='';}
        await actor.update(changes);
      }catch(error){if(created.length)await actor.deleteEmbeddedDocuments('Item',created.map(item=>item.id));throw error;}
      ui.notifications.info(`${actor.name} avançou para o nível ${this.level+1}.`);await this.close();
    }catch(error){console.error('ETMOS | Nível',error);ui.notifications.error(`Não foi possível avançar: ${error.message}`);this.working=false;button.disabled=false;}
  }
}

class EtmosCharacterGenerator extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options={}) {super(options);this.catalog={};}
  static DEFAULT_OPTIONS={classes:['etmos-generator'],position:{width:830,height:790},window:{resizable:true},actions:{create:EtmosCharacterGenerator.create}};
  static PARTS={body:{template:'systems/etmos/templates/generator.hbs'}};
  get title(){return 'Criar personagem ETMOS';}
  async _prepareContext(options){
    const context=await super._prepareContext(options);
    const kinds=['funcao','objeto','caracteristica','origem','pratica','teorica'];
    const packs={...ETMOS_PACKS,origem:'origens'};
    for(const kind of kinds){
      const pack=game.packs.get(`etmos.${packs[kind]}`);
      const docs=pack?await pack.getDocuments():[];
      this.catalog[kind]=docs.map(doc=>({uuid:doc.uuid,name:doc.name,code:doc.system.codigo || '',description:doc.system.descricao || '',mundo:doc.system.mundo || 'Ambos'})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    }
    context.groups=[['funcao','Funções',2],['objeto','Objetos',3],['caracteristica','Características',4],['origem','Características de Origem',2],['pratica','Habilidades Práticas',2],['teorica','Habilidades Teóricas',2]].map(([kind,label,count])=>({kind,label,slots:Array.from({length:count},(_,i)=>({number:i+1})),items:this.catalog[kind]}));
    return context;
  }
  _onRender(context,options){
    super._onRender(context,options);
    const root=this.element;
    const update=()=>{
      const attrs=['corpo','mente','alma'].map(key=>Number(root.querySelector(`[name="attribute-${key}"]`)?.value || 0));
      const total=attrs.reduce((sum,value)=>sum+value,0);
      const summary=root.querySelector('[data-attribute-total]');
      if(summary)summary.textContent=`${total} / 6 pontos`;
      const origin=root.querySelector('[name="origin-kind"]')?.value;
      for(const option of root.querySelectorAll('select[data-select-kind="origem"] option[value]')){
        const item=this.catalog.origem.find(entry=>entry.uuid===option.value);
        option.hidden=Boolean(item && item.mundo!=='Ambos' && item.mundo!==origin);
        option.disabled=option.hidden;
      }
      for(const select of root.querySelectorAll('[data-select-kind]')){
        if(select.selectedOptions[0]?.disabled)select.value='';
        const item=this.catalog[select.dataset.selectKind]?.find(entry=>entry.uuid===select.value);
        select.closest('.etmos-generator-choice')?.querySelector('.etmos-generator-description')?.replaceChildren(document.createTextNode(item?.description || 'Selecione para ler a descrição.'));
      }
    };
    root.addEventListener('change',update);root.addEventListener('input',update);update();
  }
  static async create(event,button){
    if(this.working)return;
    const root=this.element;
    const name=root.querySelector('[name="character-name"]')?.value.trim();
    if(!name){ui.notifications.warn('Informe o nome do personagem.');return;}
    const attrs=Object.fromEntries(['corpo','mente','alma'].map(key=>[key,Number(root.querySelector(`[name="attribute-${key}"]`)?.value)]));
    if(Object.values(attrs).some(value=>!Number.isInteger(value)||value<0||value>4)||Object.values(attrs).reduce((a,b)=>a+b,0)!==6){ui.notifications.warn('Distribua exatamente 6 pontos entre Corpo, Mente e Alma; máximo 4 em cada.');return;}
    const world=root.querySelector('[name="origin-kind"]')?.value;
    if(!['Mundano','Fantástico'].includes(world)){ui.notifications.warn('Escolha Mundano ou Fantástico.');return;}
    const counts={funcao:2,objeto:3,caracteristica:4,origem:2,pratica:2,teorica:2},selected=[];
    for(const [kind,count] of Object.entries(counts)){
      const picks=[...root.querySelectorAll(`[data-select-kind="${kind}"]`)].map(select=>this.catalog[kind]?.find(item=>item.uuid===select.value));
      if(picks.length!==count||picks.some(item=>!item)){ui.notifications.warn(`Preencha as ${count} escolhas de ${kind}.`);return;}
      if(kind==='origem' && picks.some(item=>item.mundo!=='Ambos' && item.mundo!==world)){ui.notifications.warn('Uma característica de Origem não corresponde à origem escolhida.');return;}
      if(kind!=='pratica' && kind!=='teorica' && new Set(picks.map(item=>item.uuid)).size!==count){ui.notifications.warn(`Evite escolhas repetidas em ${kind}.`);return;}
      if(['pratica','teorica'].includes(kind) && picks[0].uuid===picks[1].uuid && !STACKABLE_SKILLS.has(picks[0].name)){ui.notifications.warn(`${picks[0].name} não está cadastrada como habilidade repetível.`);return;}
      selected.push(...picks);
    }
    const pack=game.packs.get('etmos.complemento');
    if(!pack){ui.notifications.error('Compêndio de Complementos do Nível 1 indisponível.');return;}
    this.working=true;button.disabled=true;
    let actor;
    try{
      const [documents,complements]=await Promise.all([Promise.all(selected.map(item=>fromUuid(item.uuid))),pack.getDocuments()]);
      if(documents.some(doc=>!doc))throw new Error('Uma escolha do compêndio está indisponível.');
      actor=await Actor.create({name,type:'personagem',system:{nivel:1,origem:world,idade:Math.max(0,Number(root.querySelector('[name="character-age"]')?.value || 0)),atributos:attrs}});
      const sources=[...documents,...complements].map(doc=>{const data=doc.toObject();delete data._id;return data;});
      await actor.createEmbeddedDocuments('Item',sources);
      ui.notifications.info(`${name} criado com Grimório, Origem e Habilidades.`);
      await this.close();actor.sheet?.render(true);
    }catch(error){
      console.error('ETMOS | Gerador de personagem',error);
      if(actor){try{await actor.delete();}catch(cleanup){console.error('ETMOS | Falha ao limpar personagem incompleto',cleanup);}}
      ui.notifications.error(`Não foi possível criar o personagem: ${error.message}`);this.working=false;button.disabled=false;
    }
  }
}
function addEtmosGeneratorButton(app,element){
  if(!(app instanceof foundry.applications.sidebar.tabs.ActorDirectory))return;
  const root=element?.querySelector?element:app.element;
  const header=root?.querySelector('.directory-header, [data-application-part="header"]');
  if(!header || header.querySelector('.etmos-generator-launch') || !game.user?.hasPermission?.('ACTOR_CREATE'))return;
  const row=document.createElement('div');row.className='etmos-generator-launch';
  const button=document.createElement('button');button.type='button';button.innerHTML='<i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i> Gerar personagem ETMOS';
  button.addEventListener('click',()=>new EtmosCharacterGenerator().render(true));
  row.append(button);header.append(row);
}
Hooks.on('renderActorDirectory',addEtmosGeneratorButton);
Hooks.on('renderApplicationV2',addEtmosGeneratorButton);

Hooks.once('init', () => {
  CONFIG.Actor.documentClass = EtmosActor;
  foundry.applications.apps.DocumentSheetConfig.registerSheet(foundry.documents.Actor, 'etmos', EtmosSheet, {types:['personagem','criatura'], makeDefault:true, label:'Ficha ETMOS'});
  foundry.applications.apps.DocumentSheetConfig.registerSheet(foundry.documents.Item, 'etmos', EtmosItemSheet, {types:['particula','habilidade','origem','equipamento'], makeDefault:true, label:'Item ETMOS'});
});

// packFolders applies when a world first sees a system. Move our packs in existing worlds too.
Hooks.once('ready', async () => {
  if (!game.user.isGM) return;
  try {
    let root = game.folders.find(folder => folder.type === 'Compendium' && !folder.folder && folder.name === 'ETMOS · Partículas');
    root ??= await Folder.create({ name:'ETMOS · Partículas', type:'Compendium', color:'#634569' });
    for (let level = 1; level <= 4; level++) {
      let folder = game.folders.find(f => f.type === 'Compendium' && f.folder?.id === root.id && f.name === `Nível ${level}`);
      folder ??= await Folder.create({ name:`Nível ${level}`, type:'Compendium', folder:root.id });
      const names = level === 1 ? ['funcao','objeto','caracteristica','complemento'] : [`complemento-n${level}`];
      for (const name of names) {
        const pack = game.packs.get(`etmos.${name}`);
        if (pack && pack.folder?.id !== folder.id) await pack.setFolder(folder);
      }
    }
    let characters = game.folders.find(folder => folder.type === 'Compendium' && !folder.folder && folder.name === 'ETMOS · Personagens');
    characters ??= await Folder.create({ name:'ETMOS · Personagens', type:'Compendium', color:'#a66372' });
    for (const name of ['origens','habilidades-pratica','habilidades-teorica']) {
      const pack = game.packs.get(`etmos.${name}`);
      if (pack && pack.folder?.id !== characters.id) await pack.setFolder(characters);
    }
  } catch (error) { console.error('ETMOS | Não foi possível organizar os compêndios por nível.', error); }
});

export { EtmosConjuration, EtmosRollDialog };
