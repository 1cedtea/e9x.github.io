'use strict';
var ui = require('./ui.js'),
	inject = require('./inject.js'),
	tween = require('./tween.js'),
	three = require('./three.js'),
	manifest = require('../manifest.json'),
	add = Symbol(),
	values = ui.set_values({
		version: manifest.version,
		oconfig: {
			esp: {
				status: 'off',
				nametags: false,
				tracers: false,
				health_bar: false,
				wall_opac: 0.6,
				walls: false,
				minimap: false,
			}, game: {
				bhop: 'off',
				pitch_mod: 'off',
				autoreload: false,
				overlay: false,
				wireframe: false,
				auto_respawn: false,
				skins: false,
			}, aim: {
				status: 'off',
				target: 'head',
				target_sorting: 'dist2d',
				frustrum_check: false,
				auto_reload: false,
				wallbangs: false,
				smooth: false,
				smoothn: 25,
			}, kb: { // keybinds
				aim: 3,
				bhop: 4,
				esp: 5,
				tracers: 6,
				nametags: 7,
				overlay: 8,
				disable_settings: 9,
			},
		},
		consts: {
			ss_dev: true,
		},
	}),
	cheat = {},
	config = {},
	cheat = {
		pi2: Math.PI * 2,
		wf: (check, timeout = 5000) => new Promise((resolve, reject) => {
			var interval = setInterval(() => {
				var checked = check();
				
				if(checked)clearInterval(interval); else return;
				
				resolve(checked);
				interval = null;
			}, 15);
			
			setTimeout(() => {
				if(interval)return clearInterval(interval), reject('timeout');
			}, timeout);
		}),
		syms: new Proxy({}, {
			get(target, prop){
				if(!target[prop])target[prop] = Symbol();
				
				return target[prop];
			}
		}),
		rnds: new Proxy({}, {
			get(target, prop){
				if(!target[prop])target[prop] = [...Array(16)].map(() => Math.random().toString(36)[2]).join('').replace(/(\d|\s)/, 'V').toLowerCase().substr(0, 6);
				
				return target[prop];
			}
		}),
		objs: new Proxy({}, {
			get(target, prop){
				if(!target[prop])target[prop] = cheat.object_list[~~(Math.random() * cheat.object_list.length)];
				
				return target[prop];
			}
		}),
		object_list: Object.getOwnPropertyNames(window).filter(key => !(/webkit/gi.test(key)) && typeof window[key] == 'function' && String(window[key]) == 'function ' + key + '() { [native code] }' && Object.getOwnPropertyDescriptor(window, key).configurable),
		vars_not_found: [],
		vars: {},
		materials_esp: new Proxy({}, {
			get(target, prop){
				if(!target[prop])target[prop] = new three.MeshBasicMaterial({
					transparent: true,
					fog: false,
					depthTest: false,
					color: prop,
				});
				
				return target[prop];
			},
		}),
		regions: {
			SYD: 'au-syd',
			TOK: 'jb-hnd',
			MIA: 'us-fl',
			SV: 'us-ca-sv',
			FRA: 'de-fra',
			SIN: 'sgp',
			NY: 'us-nj',
		},
		log(...args){
			if(values.consts.ss_dev)console.log('%cShitsploit', 'background: #27F; color: white; border-radius: 3px; padding: 3px 2px; font-weight: 600', ...args);
			
			return true;
		},
		err(...args){
			if(values.consts.ss_dev)console.error('%cShitsploit', 'background: #F22; color: white; border-radius: 3px; padding: 3px 2px; font-weight: 600', '\n', ...args);
			
			return true;
		},
		wrld2scrn(pos, aY = 0){
			if(!cheat.cas)return { x: 0, y: 0 };
			
			var pos = Object.assign({}, pos, { y: pos.y + aY });
			
			cheat.world.camera.updateMatrix();
			cheat.world.camera.updateMatrixWorld();
			
			pos.project(cheat.world.camera);
			
			return {
				x: (pos.x + 1) / 2 * cheat.cas.width,
				y: (-pos.y + 1) / 2 * cheat.cas.height,
			}
		},
		util: {
			normal_radian(radian){
				radian = radian % cheat.pi2;
				
				if(radian < 0)radian += cheat.pi2;
				
				return radian;
			},
			containsPoint(frustum, point){
				
				for(var ind = 0; ind < 6; ind++)if(frustum.planes[ind].distanceToPoint(point) < 0)return false;
				
				return true;
			},
			canSee(player, target, offset = 0){
				if(!player)return false;
				
				var d3d = cheat.util.getD3D(player.x, player.y, player.z, target.x, target.y, target.z),
					dir = cheat.util.getDir(player.z, player.x, target.z, target.x),
					dist_dir = cheat.util.getDir(cheat.util.getDistance(player.x, player.z, target.x, target.z), target.y, 0, player.y),
					ad = 1 / (d3d * Math.sin(dir - Math.PI) * Math.cos(dist_dir)),
					ae = 1 / (d3d * Math.cos(dir - Math.PI) * Math.cos(dist_dir)),
					af = 1 / (d3d * Math.sin(dist_dir)),
					height = player.y + (player.height || 0) - 1.15, // 1.15 = config.cameraHeight
					obj;
				
				// iterate through game objects
				for(var ind in cheat.game.map.manager.objects){
					obj = cheat.game.map.manager.objects[ind];
					
					if(!obj.noShoot && obj.active && (cheat.player.weapon && cheat.player.weapon.pierce && config.aim.wallbangs ? !obj.penetrable : true)){	

						var in_rect = cheat.util.lineInRect(player.x, player.z, height, ad, ae, af, obj.x - Math.max(0, obj.width - offset), obj.z - Math.max(0, obj.length - offset), obj.y - Math.max(0, obj.height - offset), obj.x + Math.max(0, obj.width - offset), obj.z + Math.max(0, obj.length - offset), obj.y + Math.max(0, obj.height - offset));
						
						if(in_rect && 1 > in_rect)return in_rect;
					}
				}
				
				// iterate through game terrain
				if(cheat.game.map.terrain){
					var al = cheat.game.map.terrain.raycast(player.x, -player.z, height, 1 / ad, -1 / ae, 1 / af);
					if(al)return cheat.util.getD3D(player.x, player.y, player.z, al.x, al.z, -al.y);
				}
			},
			getDistance(x1, y1, x2, y2){
				return Math.sqrt((x2 -= x1) * x2 + (y2 -= y1) * y2);
			},
			getD3D(x1, y1, z1, x2, y2, z2){
				var dx = x1 - x2,
					dy = y1 - y2,
					dz = z1 - z2;
				
				return Math.sqrt(dx * dx + dy * dy + dz * dz);
			},
			getXDire: (x1, y1, z1, x2, y2, z2) => Math.asin(Math.abs(y1 - y2) / cheat.util.getD3D(x1, y1, z1, x2, y2, z2)) * ((y1 > y2) ? -1 : 1),
			getDir: (x1, y1, x2, y2) => Math.atan2(y1 - y2, x1 - x2),
			lineInRect(lx1, lz1, ly1, dx, dz, dy, x1, z1, y1, x2, z2, y2){
				var t1 = (x1 - lx1) * dx,
					t2 = (x2 - lx1) * dx,
					t3 = (y1 - ly1) * dy,
					t4 = (y2 - ly1) * dy,
					t5 = (z1 - lz1) * dz,
					t6 = (z2 - lz1) * dz,
					tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6)),
					tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));
				
				return (tmax < 0 || tmin > tmax) ? false : tmin;
			},
		},
		round: (n, r) => Math.round(n * Math.pow(10, r)) / Math.pow(10, r),
		ctr(label, args = []){ // ctx raw
			if(!cheat.ctx)return;
			
			return Reflect.apply(CanvasRenderingContext2D.prototype[label], cheat.ctx, args);
		},
		find_match: async () => {
			if(cheat.finding_match)return;
			cheat.finding_match = true;
			
			var new_match,
				region = cheat.regions[new URLSearchParams(location.search).get('game')],
				data = await fetch('https://matchmaker.krunker.io/game-list?hostname=' + window.location.host).then(res => res.json());
			
			new_match = data.games.map(([ match_id, match_region, match_players, match_max_players, gamemode ]) => ({
				id: match_id,
				region: match_region,
				players: match_players,
				max_players: match_max_players,
				gamemode: { name: gamemode.i, game_id: gamemode.v, custom: gamemode.cs }
			}))
			.sort((prev_match, match) => ((match.players >= 6 ? 4 : match.players) / match.max_players) * 100 - ((prev_match.players >= 6 ? 4 : prev_match.players) / prev_match.max_players) * 100)
			.find(match => !match.gamemode.custom && match.region == region && (match.players <= match.max_players - 2 || match.players <= match.max_players - 1));
			
			location.href = 'https://krunker.io/?game=' +  new_match.id;
		},
		process_interval(){ // run every 1000 ms
			if(!parent.document.querySelector('#instructions'))return;
			
			var intxt = parent.document.querySelector('#instructions').textContent;
			
			if(config.game.auto_respawn){
				if(/(disconnected|game is full|banned|kicked)/gi.test(intxt))cheat.find_match()
				else if(cheat.controls && (!cheat.player || !cheat.player[add].active) && /click to play/gi.test(intxt))cheat.controls.toggle(true);
			}
			
			parent.document.querySelectorAll('.streamItem *').forEach(node => node.src = '');
		},
		dist_center(pos){
			return Math.hypot((parent.innerWidth / 2) - pos.x, (parent.innerHeight / 2) - pos.y);
		},
		sorts: {
			dist3d(ent_1, ent_2){
				return ent_1[add].pos.distanceTo(ent_2) * (ent_1[add].frustum == ent_2[add].frustum ? 1 : 0.5);
			},
			dist2d(ent_1, ent_2){
				//  * (ent_1[add].frustum ? 2 : 0.5
				return (ent_1, ent_2) => (dist_center(ent_1[add].pos2D) - dist_center(ent_2[add].pos2D));
			},
			hp(ent_1, ent_2){
				return (ent_1.health - ent_2.health) * (ent_1[add].frustum == ent_2[add].frustum ? 1 : 0.5);
			},
		},
		procInputs(data, ...args){
			if(!cheat.controls || !cheat.player || !cheat.player[add])return;
			
			var keys = {frame: 0, delta: 1, xdir: 2, ydir: 3, moveDir: 4, shoot: 5, scope: 6, jump: 7, reload: 8, crouch: 9, weaponScroll: 10, weaponSwap: 11, moveLock: 12},
				move_dirs = { idle: -1, forward: 1, back: 5, left: 7, right: 3 },
				target = cheat.target = cheat.game.players.list.filter(ent => ent[add] && !ent[add].is_you && ent[add].canSee && ent[add].active && ent[add].enemy && (config.aim.frustrum_check ? ent[add].frustum : true)).sort(cheat.sorts[config.aim.target_sorting])[0],
				pm = cheat.game.players.list.filter(ent => ent && ent[add] && ent[add].active && ent[add].enemy && ent[add].canSee).map(ent => ent[add].obj);
			
			// skid bhop
			if(config.game.bhop != 'off' && (ui.inputs.Space || config.game.bhop == 'autojump' || config.game.bhop == 'autoslide')){
				cheat.controls.keys[cheat.controls.binds.jumpKey.val] ^= 1;
				if(cheat.controls.keys[cheat.controls.binds.jumpKey.val])cheat.controls.didPressed[cheat.controls.binds.jumpKey.val] = 1;
				
				if((parent.document.activeElement.nodeName != 'INPUT' && config.game.bhop == 'keyslide' && ui.inputs.Space || config.game.bhop == 'autoslide') && cheat.player[cheat.vars.yVel] < -0.02 && cheat.player.canSlide){
					setTimeout(() => cheat.controls.keys[cheat.controls.binds.crouchKey.val] = 0, 325);
					cheat.controls.keys[cheat.controls.binds.crouchKey.val] = 1;
				}
			}
			
			// auto reload, currentAmmo set earlier
			if(cheat.player && !cheat.player[cheat.vars.ammos][cheat.player[cheat.vars.weaponIndex]] && config.aim.auto_reload)data[keys.reload] = 1;
			
			if(config.aim.status == 'triggerbot' && cheat.player[add].aiming){
				(cheat.raycaster.setFromCamera({ x: 0, y: 0 }, cheat.world.camera), cheat.raycaster.intersectObjects(pm, true).length) && (data[keys.shoot] = cheat.player[cheat.vars.didShoot] ? 0 : 1);
			}else if(cheat.target && cheat.player.health && !data[keys.reload]){
				var yVal = target.y + (target[cheat.syms.isAI] ? -(target.dat.mSize / 2) : (target.jumpBobY * cheat.gconfig.jumpVel) + 1 - target[add].crouch * 3),
					yDire = cheat.util.getDir(cheat.player[add].pos.z, cheat.player[add].pos.x, target.z, target.x),
					xDire = cheat.util.getXDire(cheat.player[add].pos.x, cheat.player[add].pos.y, cheat.player[add].pos.z, target.x, yVal, target.z),
					xv = xDire - cheat.player[cheat.vars.recoilAnimY] * 0.27,
					rot = {
						x: cheat.round(Math.max(-Math.PI / 2, Math.min(Math.PI / 2, xv )) % cheat.pi2, 3) || 0,
						y: cheat.util.normal_radian(cheat.round(yDire % cheat.pi2, 3)) || 0,
					},
					do_aim,
					shot;
				
				// if fully aimed or weapon cant even be aimed or weapon is melee and nearby, shoot
				if(config.aim.status == 'silent' && cheat.player[add].aiming)(cheat.player[cheat.vars.ammos][cheat.player[cheat.vars.weaponIndex]] || cheat.player.weapon.ammo == null) ? data[keys.shoot] = 1 : data[keys.reload] = 1;
				
				do_aim = config.aim.status == 'silent'
					? data[keys.shoot] || cheat.player.weapon.melee
					: config.aim.status == 'assist' && (cheat.controls[cheat.vars.mouseDownR] || cheat.controls.keys[cheat.controls.binds.aimKey.val]);
				
				shot = cheat.player.weapon.nAuto && cheat.player[cheat.vars.didShoot];
				
				if(!cheat.aim_tween || !cheat.aim_tween._isPlaying)cheat.aim_tween = new tween.Tween({
					x: cheat.controls[cheat.vars.pchObjc].rotation.x,
					y: cheat.util.normal_radian(cheat.controls.object.rotation.y),
				}).easing(tween.Easing.Quadratic.InOut).onUpdate(rot => cheat.aim_rot = rot);
				
				if(config.aim.smooth)switch(config.aim.status){
					case'assist':
						
						if(do_aim){
							cheat.aim_tween.to(rot, values.config.aim.smoothn * 25);
							cheat.aim_tween.start();
							cheat.aim_tween.update();
							
							if(cheat.aim_rot){
								cheat.controls[cheat.vars.pchObjc].rotation.x = cheat.aim_rot.x;
								cheat.controls.object.rotation.y = cheat.aim_rot.y;
								
								data[keys.xdir] = cheat.aim_rot.x * 1000;
								data[keys.ydir] = cheat.aim_rot.y * 1000;
							}
						}else if(cheat.aim_tween)delete cheat.aim_tween;
						
						break
					case'silent':
						
						if(shot)data[keys.shoot] = data[keys.scope] = 0;
						else data[keys.scope] = 1;
						
						if(do_aim){
							data[keys.xdir] = rot.x * 1000;
							data[keys.ydir] = rot.y * 1000;
						}
						
						break
				}else switch(config.aim.status){
					case'silent':
						// dont shoot if weapon is on shoot cooldown
						if(shot)data[keys.shoot] = data[keys.scope] = 0;
						else data[keys.scope] = 1;
						
						// wait until we are shooting to look at enemy
						if(do_aim){
							data[keys.xdir] = rot.x * 1000;
							data[keys.ydir] = rot.y * 1000;
						}
						
						break
					case'assist':
						
						if(do_aim){
							cheat.controls[cheat.vars.pchObjc].rotation.x = rot.x;
							cheat.controls.object.rotation.y = rot.y;
							
							data[keys.xdir] = rot.x * 1000;
							data[keys.ydir] = rot.y * 1000;
						}
						
						break
				}
			}else if(cheat.aim_tween)delete cheat.aim_tween;
			
			this[cheat.syms.procInputs](data, ...args);
		},
		obj_mat(obj){
			if(obj.type == 'Mesh' && obj.dSrc && !obj.material[cheat.syms.hooked]){
				obj.material[cheat.syms.hooked] = true;
				
				var otra = obj.material.transparent,
					opac = obj.material.opacity,
					oclr = obj.material.color;
				
				Object.defineProperties(obj.material, {
					opacity: {
						get: _ => config.esp.walls ? opac * config.esp.wall_opac : opac,
						set: _ => opac = _,
					},
					transparent: {
						get: _ => config.esp.walls ? true : otra,
						set: _ => otra = _,
					},
				});
			}
		},
		ent_pos: {
			distanceTo(p2){return Math.hypot(this.x - p2.x, this.y - p2.y, this.z - p2.z)},
			project(t){ return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)},
			applyMatrix4(t){var e=this.x,n=this.y,r=this.z,i=t.elements,a=1/(i[3]*e+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*e+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*e+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*e+i[6]*n+i[10]*r+i[14])*a,this},
		},
		ent_vals(ent){
			if(!ent[add]){
				ent[add] = {
					pos: Object.assign({}, cheat.ent_pos),
				};
			}
			
			ent[add].risk = ent.isDev || ent.isMod || ent.isMapMod || ent.canGlobalKick || ent.canViewReports || ent.partnerApp || ent.canVerify || ent.canTeleport || ent.isKPDMode || ent.level >= 30;
			
			ent[add].is_you = ent[cheat.vars.isYou];
			
			ent[add].pos.x = ent.x || 0;
			ent[add].pos.y = ent.y || 0;
			ent[add].pos.z = ent.z || 0;
			
			ent[add].aiming = !ent[cheat.vars.aimVal] || ent.weapon.noAim || cheat.target && cheat.target[add] && ent.weapon.melee && ent[add].pos.distanceTo(cheat.target[add].pos) <= 18;
			
			ent[add].crouch = ent[cheat.vars.crouchVal];
			
			ent[add].obj = ent && ent.lowerBody && ent.lowerBody.parent && ent.lowerBody.parent ? ent.lowerBody.parent.parent : null;
			
			ent[add].health = ent.health;
			ent[add].max_health = ent[cheat.vars.maxHealth];
			ent[add].pos2D = ent.x != null ? cheat.wrld2scrn(ent[add].pos) : { x: 0, y: 0 };
			ent[add].canSee = ent[add].active && cheat.util.canSee(cheat.player, ent) == null ? true : false;
			
			ent[add].frustum = cheat.util.containsPoint(cheat.world.frustum, ent[add].pos);
			
			ent[add].active = ent && ent.x != null && ent[add].obj && cheat.ctx && ent.health > 0;
			ent[add].enemy = !ent.team || ent.team != cheat.player.team;
			ent[add].did_shoot = ent[cheat.vars.didShoot];
			
			if(ent[add].active){
				if(ent[add].obj)ent[add].obj.visible = true;
				
				var normal = ent[cheat.vars.inView];
				
				ent[cheat.vars.inView] = cheat.hide_nametags ? false : config.esp.nametags || normal;
			}
		},
		draw_text(lines, text_x, text_y, font_size){
			for(var text_index = 0; text_index < lines.length; text_index++){
				var line = lines[text_index],
					xoffset = 0,
					color,
					text,
					text_args;
				
				for(var sub_ind = 0; sub_ind < line.length; sub_ind++){
					// if(!line[sub_ind])continue;
					
					color = line[sub_ind][0];
					text = line[sub_ind][1];
					text_args = [ text, text_x + xoffset, text_y + text_index * (font_size + 2) ];
					
					cheat.ctx.fillStyle = color;
					
					cheat.ctr('strokeText', text_args);
					cheat.ctr('fillText', text_args);
					
					xoffset += cheat.ctr('measureText', [ text ]).width + 2;
				}
			}
		},
		ent_visuals(ent){
			if(!ent[add] || !ent[add].active || !ent[add].frustum || ent[add].is_you)return;
			
			var src_pos = cheat.wrld2scrn(ent[add].pos),
				src_pos_crouch = cheat.wrld2scrn(ent[add].pos, ent.height - ent[add].crouch * 3),
				esp_width = ~~((src_pos.y - cheat.wrld2scrn(ent[add].pos, ent.height).y) * 0.7),
				esp_height = src_pos.y - src_pos_crouch.y,
				esp_box_y = src_pos.y - esp_height,
				// teammate = green, enemy = red, risk + enemy = orange
				cham_color = ent[add].is_you ? '#FFF' : ent[add].enemy ? ent[add].risk ? '#F70' : '#F00' : '#0F0',
				cham_color_full = parseInt(cham_color.substr(1).split('').map(e => e+e).join(''), 16), // turn #FFF into #FFFFFF
				chams_enabled = config.esp.status == 'chams' || config.esp.status == 'box_chams' || config.esp.status == 'full';
			
			if(ent[add].obj)ent[add].obj.traverse(obj => {
				if(obj.type != 'Mesh')return;
				
				obj.material.wireframe = !!config.game.wireframe;
				
				if(ent[add].is_you || obj[cheat.syms.hooked])return;
				
				obj[cheat.syms.hooked] = true;
				
				var orig_mat = obj.material;
				
				Object.defineProperty(obj, 'material', {
					get: _ => config.esp.status == 'chams' || config.esp.status == 'box_chams' || config.esp.status == 'full'
						? cheat.materials_esp[ent[add].enemy ? ent[add].risk ? '#F70' : '#F00' : '#0F0']
						: orig_mat,
					set: _ => orig_mat = _,
				});
			});
			
			// box ESP
			if(config.esp.status == 'box' || config.esp.status == 'box_chams' || config.esp.status == 'full'){
				cheat.ctx.strokeStyle = cham_color
				cheat.ctx.lineWidth = 1.5;
				cheat.ctr('strokeRect', [ src_pos.x - esp_width / 2,  esp_box_y, esp_width, esp_height ]);
			}
			
			// health bar, red - yellow - green gradient
			var hp_perc = (ent.health / ent[add].max_health) * 100;
			
			if(config.esp.status == 'full' || config.esp.health_bars){
				var p1 = src_pos.y - esp_height,
					p2 = src_pos.y - esp_height + esp_height;
				
				// work around to non-finite stuff
				if(p1 && p2){
					var hp_grad = cheat.ctr('createLinearGradient', [0, p1, 0, p2 ]),
						box_ps = [src_pos.x - esp_width, src_pos.y - esp_height, esp_width / 4, esp_height];
					
					hp_grad.addColorStop(0, '#F00');
					hp_grad.addColorStop(0.5, '#FF0');
					hp_grad.addColorStop(1, '#0F0');
					
					// background of thing
					cheat.ctx.strokeStyle = '#000';
					cheat.ctx.lineWidth = 2;
					cheat.ctx.fillStyle = '#666';
					cheat.ctr('strokeRect', box_ps);
					
					// inside of it
					cheat.ctr('fillRect', box_ps);
					
					box_ps[3] = (hp_perc / 100) * esp_height;
					
					// colored part
					cheat.ctx.fillStyle = hp_grad
					cheat.ctr('fillRect', box_ps);
				}
			}
			
			// full ESP
			cheat.hide_nametags = config.esp.status == 'full'
			if(config.esp.status == 'full'){
				// text stuff
				var hp_red = hp_perc < 50 ? 255 : Math.round(510 - 5.10 * hp_perc),
					hp_green = hp_perc < 50 ? Math.round(5.1 * hp_perc) : 255,
					hp_color = '#' + ('000000' + (hp_red * 65536 + hp_green * 256 + 0 * 1).toString(16)).slice(-6),
					player_dist = cheat.player[add].pos.distanceTo(ent[add].pos),
					font_size = ~~(11 - (player_dist * 0.005));
				
				cheat.ctx.textAlign = 'middle';
				cheat.ctx.font = 'Bold ' + font_size + 'px Tahoma';
				cheat.ctx.strokeStyle = '#000';
				cheat.ctx.lineWidth = 2.5;
				
				cheat.draw_text([
					[['#FB8', ent.alias], ['#FFF', ent.clan ? ' [' + ent.clan + ']' : '']],
						[[hp_color, ent.health + '/' + ent[add].max_health + ' HP']],
					// player weapon & ammo
					[['#FFF', ent.weapon.name ],
						['#BBB', '['],
						['#FFF', (ent.weapon.ammo || 'N') + '/' + (ent.weapon.ammo || 'A') ],
						['#BBB', ']']],
					[['#BBB', 'Risk: '], [(ent[add].risk ? '#0F0' : '#F00'), ent[add].risk]],
					[['#BBB', 'Shootable: '], [(ent[add].canSee ? '#0F0' : '#F00'), ent[add].canSee]],
					[['#BBB', '['], ['#FFF', ~~(player_dist / 10) + 'm'], ['#BBB', ']']],
				], src_pos_crouch.x + 12 + (esp_width / 2), src_pos.y - esp_height, font_size);
			}
			
			// tracers
			if(config.esp.tracers){
				cheat.ctx.strokeStyle = cham_color;
				cheat.ctx.lineWidth = 1.75;
				cheat.ctx.lineCap = 'round';
				
				cheat.ctr('beginPath');
				cheat.ctr('moveTo', [cheat.cas.width / 2, cheat.cas.height]);
				cheat.ctr('lineTo', [src_pos.x, src_pos.y - esp_height / 2]);
				cheat.ctr('stroke');
			}
		},
		process(){
			if(!cheat.game)return;
			
			// arrow controls
			cheat.controls[cheat.vars.pchObjc].rotation.x -= ui.inputs.ArrowDown ? 0.006 : 0;
			cheat.controls[cheat.vars.pchObjc].rotation.x += ui.inputs.ArrowUp ? 0.006 : 0;
			
			cheat.controls.object.rotation.y -= ui.inputs.ArrowRight ? 0.00675 : 0;
			cheat.controls.object.rotation.y += ui.inputs.ArrowLeft ? 0.00675 : 0;
			
			if(!cheat.controls || !cheat.world || !cheat.player)return;
			
			cheat.game.players.list.forEach(cheat.ent_vals);
		},
		// axis
		v3: ['x', 'y', 'z'],
		render(){ // rendering tasks
			if(!cheat.cas || !cheat.ctx){
				cheat.cas = parent.document.querySelector('#game-overlay');
				cheat.ctx = cheat.cas ? cheat.cas.getContext('2d', { alpha: true }) : {};
			}
			
			cheat.ctr('resetTransform');
			
			if(config.esp.minimap){
				var cm = cheat.game.map.maps[cheat.game.map.lastGen];
				
				if(!cm)return;
				
				if(!cm.mm || !cm.dims){
					cm.mm = {
						scale: 6,
						offset: {
							x: 100,
							y: 75,
						},
						player_size: {
							w: 5,
							h: 5
						},
					};
					
					cm.objs = cm.objects.map(obj => ({ collision: !(obj.l || obj.col), pos: { x: obj.p[0], y: obj.p[1], z: obj.p[2] }, size: { x: obj.s[0], y: obj.s[1], z: obj.s[2] }, color: obj.c, opacity: obj.o == null ? 1 : obj.o  })).filter(obj =>
						obj.collision &&
						obj.opacity &&
						obj.color &&
						obj.size.x &&
						obj.size.y && 
						obj.size.z &&
						obj.pos.y);
					
					cm.dims = { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
					
					cm.objs.forEach(obj => {
						cm.dims.min.x = obj.pos.x < cm.dims.min.x ? obj.pos.x : cm.dims.min.x;
						cm.dims.max.x = obj.pos.x > cm.dims.min.x ? obj.pos.x : cm.dims.min.x;
						
						cm.dims.min.z = obj.pos.z < cm.dims.min.z ? obj.pos.z : cm.dims.min.z;
						cm.dims.max.z = obj.pos.z > cm.dims.min.z ? obj.pos.z : cm.dims.min.z;
					});
					
					cm.dims.size = {
						w: Math.abs(cm.dims.min.x) + Math.abs(cm.dims.max.x),
						h: Math.abs(cm.dims.min.z) + Math.abs(cm.dims.max.z),
					};
					
					cm.dims.min.x_abs = Math.abs(cm.dims.min.x);
					cm.dims.min.z_abs = Math.abs(cm.dims.min.z);
					
					cm.objs = cm.objs.sort((pobj, obj) => (pobj.pos.y + pobj.size.y) - (obj.pos.y + obj.size.y));
					
					cm.obj_calc = cm.objs.map(obj => {
						var cth = c => ((~~c).toString(16) + '').padStart(2, '0'),
							htc = h => {
								var [r, g, b] = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h).slice(1).map(n => parseInt(n, 16));
								
								return { r: r, g: g, b: b };
							},
							color = htc(obj.color.length == 4 ? '#' + obj.color.substr(1).split('').map(e => e+e).join('') : obj.color),
							inc = (obj.pos.y + obj.size.y) / 3;
						
						return [
							'#' + cth(color.r - inc) + cth(color.g - inc) + cth(color.b - inc),
							[
								~~(cm.mm.offset.x + ((cm.dims.min.x_abs + obj.pos.x) / cm.mm.scale)),
								~~(cm.mm.offset.y + ((cm.dims.min.z_abs + obj.pos.z) / cm.mm.scale)),
								~~(obj.size.x / cm.mm.scale),
								~~(obj.size.z / cm.mm.scale)
							],
						];
					});
				};
				
				cm.obj_calc.forEach(calculated => (cheat.ctx.fillStyle = calculated[0], cheat.ctr('fillRect', calculated[1])));
				
				cheat.game.players.list.filter(ent => ent[add] && ent[add].active).forEach(ent => {
					var wp = cm.dims.min.x_abs + ent[add].pos.x,
						hp = cm.dims.min.z_abs + ent[add].pos.z,
						cham_color = ent[add].is_you ? '#FFF' : (ent[add].enemy ? ent[add].risk ? '#F70' : '#F00' : '#0F0');
					
					cheat.ctx.fillStyle = cheat.ctx.strokeStyle = cham_color;
					
					cheat.ctr('beginPath');
					cheat.ctr('arc', [ cm.mm.offset.x + (wp / cm.mm.scale), cm.mm.offset.y + (hp / cm.mm.scale), 3, 0, 2 * Math.PI ]);
					cheat.ctr('fill');
					
					if(ent[add].is_you){
						cheat.ctr('beginPath');
						cheat.ctr('moveTo', [ cm.mm.offset.x + (wp / cm.mm.scale), cm.mm.offset.y + (hp / cm.mm.scale) ]);
						
						var qx = ent[add].obj.quaternion.x,
							qy = ent[add].obj.quaternion.y,
							qz = ent[add].obj.quaternion.z,
							qw = ent[add].obj.quaternion.w,
							ix = qw * 0 + qy * 1 - qz * 0,
							iy = qw * 0 + qz * 0 - qx * 1,
							iz = qw * 1 + qx * 0 - qy * 0,
							iw = -qx * 0 - qy * 0 - qz * 1,
							nwp = cm.dims.min.x_abs + ent[add].pos.x + (ix * qw + iw * -qx + iy * -qz - iz * -qy) * -250,
							nhp = cm.dims.min.z_abs + ent[add].pos.z + (iz * qw + iw * -qz + ix * -qy - iy * -qx) * -250;
						
						cheat.ctx.strokeStyle = cham_color;
						cheat.ctx.lineWidth = 1.75;
						cheat.ctx.lineCap = 'round';
						
						cheat.ctr('lineTo', [ cm.mm.offset.x + (nwp / cm.mm.scale) - cm.mm.player_size.w / 2, cm.mm.offset.y + (nhp / cm.mm.scale) - cm.mm.player_size.h / 2 ]);
						cheat.ctr('stroke');
					}
				});
			}
			
			// draw overlay stuff
			if(config.game.overlay && cheat.game && cheat.ctx){
				cheat.ctx.strokeStyle = '#000'
				cheat.ctx.font = 'Bold 14px Inconsolata, monospace';
				cheat.ctx.textAlign = 'start';
				cheat.ctx.lineWidth = 2.6;
				
				var lines = [
					[['#BBB', 'Player: '], ['#FFF', cheat.player && cheat.player[add] && cheat.player[add].pos ? cheat.v3.map(axis => axis + ': ' + cheat.player[add].pos[axis].toFixed(2)).join(', ') : 'N/A']],
					// [['#BBB', 'Camera: '], ['#FFF', cheat.controls.object.rotation.y + ', ' + cheat.controls[cheat.vars.pchObjc].rotation.x ]],
					
					[['#BBB', 'Target: '], ['#FFF', cheat.target && cheat.target[add] && cheat.target[add].active ? cheat.target.alias + ', ' + cheat.v3.map(axis => axis + ': ' + cheat.target[add].pos[axis].toFixed(2)).join(', ') : 'N/A']],
					[['#BBB', 'Hacker: '], [parent.activeHacker ? '#0F0' : '#F00', parent.activeHacker ? 'TRUE' : 'FALSE']],
					[['#BBB', 'Aiming: '], [cheat.player && cheat.player[add] && cheat.player[add].aiming ? '#0F0' : '#F00', cheat.player && cheat.player[add] && cheat.player[add].aiming ? 'TRUE' : 'FALSE']],
				];
				
				cheat.draw_text(lines, 15, ((cheat.cas.height / 2) - (lines.length * 14)  / 2), 14);
			}
			
			if(!cheat.game || !cheat.controls || !cheat.world)return;
			
			cheat.world.scene.children.forEach(cheat.obj_mat);
			
			cheat.game.players.list.forEach(cheat.ent_visuals);
		},
		find_vars: [
			['isYou', /this\['accid'\]=0x0,this\['(\w+)'\]=\w+,this\['isPlayer'\]/, 1],
			['inView', /&&!\w\['\w+']&&\w\['\w+'\]&&\w\['(\w+)']\){/, 1],
			['pchObjc', /0x0,this\['(\w+)']=new \w+\['Object3D']\(\),this/, 1],
			['aimVal', /this\['(\w+)']-=0x1\/\(this\['weapon']\['aimSpd']/, 1],
			['crouchVal', /this\['(\w+)']\+=\w\['crouchSpd']\*\w+,0x1<=this\['\w+']/, 1],
			['didShoot', /--,\w+\['(\w+)']=!0x0/, 1],
			['ammos', /\['length'];for\(\w+=0x0;\w+<\w+\['(\w+)']\['length']/, 1],
			['weaponIndex', /\['weaponConfig']\[\w+]\['secondary']&&\(\w+\['(\w+)']==\w+/, 1],
			['maxHealth', /\['regenDelay'],this\['(\w+)']=\w+\['mode'\]&&\w+\['mode']\['\1']/, 1],
			['yVel', /this\['y']\+=this\['(\w+)']\*\w+\['map']\['config']\['speedY']/, 1],
			['mouseDownR', /this\['(\w+)']=0x0,this\['keys']=/, 1], 
			['recoilAnimY', /this\['reward']=0x0,this\['\w+']=0x0,this\['(\w+)']=0x0,this\['\w+']=0x0,this\['\w+']=0x1,this\['slideLegV']/, 1],
			['procInputs', /this\['(\w+)']=function\(\w+,\w+,\w+,\w+\){this\['recon']/, 1],
		],
		patches: new Map([
			// get vars
			[/(this\['moveObj']=func)/, 'ssd.game = this, $1'],
			[/(this\['backgroundScene']=)/, 'ssd.world = this, $1'],
			
			// hijack rendering
			[/requestAnimFrame(F|)\(/g, 'ssd.frame(requestAnimFrame$1, '],
			
			[/^/, 'ssd.info("injected"); '],
			
			// get webpack modules
			[/(\w+)\(\1\['\w+']=0x\d+\);/, '$&; ssd.mod($1)'],
			
			[/(\w+)\['skins'](?!=)/g, 'ssd.skin($1)'],
		]),
		storage: {
			skins: [...new Uint8Array(5e3)].map((e, i) => ({ ind: i, cnt: 1 })),
			get config(){ return config },
			get player(){ return cheat.player || { weapon: {} } },
			get target(){ return cheat.target || {} },
			mod(__webpack_require__){
				var vals = Object.values(__webpack_require__.c);
				
				Object.entries({
					// util: ['hexToRGB', 'keyboardMap'],
					gconfig: [ 'isNode', 'isComp', 'isProd' ],
					ws: [ 'connected', 'send', 'trackPacketStats' ],
				}).forEach(([ label, entries ]) => vals.forEach(mod => !entries.some(entry => !Reflect.apply(Object.prototype.hasOwnProperty, mod.exports, [ entry ])) && (cheat[label] = mod.exports)));
			},
			set game(nv){
				cheat.game = nv;
			},
			set world(nv){
				cheat.world = nv;
			},
			skin(player){
				return config.game.skins ? Object.assign(cheat.storage.skins, player.skins) : player.skins;
			},
			frame(frame, func){
				cheat.player = cheat.game ? cheat.game.players.list.find(player => player[cheat.vars.isYou]) : null;
				cheat.controls = cheat.game ? cheat.game.controls : null;
				
				if(cheat.player && cheat.player[cheat.vars.procInputs] && !cheat.player[cheat.syms.procInputs]){
					cheat.player[cheat.syms.procInputs] = cheat.player[cheat.vars.procInputs];
					
					cheat.player[cheat.vars.procInputs] = cheat.procInputs;
				}
				
				if(cheat.world)cheat.world.scene.onBeforeRender = cheat.process;
				
				if(cheat.ws && !cheat.ws[cheat.syms.hooked] && cheat.ws.send){
					cheat.ws[cheat.syms.hooked] = true;
					
					var osend = cheat.ws.send.bind(cheat.ws),
						odispatch = cheat.ws._dispatchEvent.bind(cheat.ws);

					cheat.ws.send = (label, ...data) => {
						if(label == 'en' && config.game.skins)cheat.skin_conf = {
							weapon: data[0][2],
							hat: data[0][3],
							body: data[0][4],
							knife: data[0][9],
							dye: data[0][14],
							waist: data[0][17],
						};
						
						return osend(label, ...data);
					}
					
					cheat.ws._dispatchEvent = (label, data) => {
						if(config.game.skins && label[0] == 0 && cheat.skin_conf){
							// sending server player data
							var player_size = 38,
								pd = data[0];
							
							for(;pd.length % player_size != 0;)player_size++;
							
							for(var i = 0; i < pd.length; i += player_size)if(pd[i] == cheat.ws.socketId){
								pd[i + 12] = cheat.skin_conf.weapon;
								pd[i + 13] = cheat.skin_conf.hat;
								pd[i + 14] = cheat.skin_conf.body;
								pd[i + 19] = cheat.skin_conf.knife;
								pd[i + 25] = cheat.skin_conf.dye;
								pd[i + 33] = cheat.skin_conf.waist;
							}
						}
						
						return odispatch(label, data);
					}
				}
				
				cheat.render();
				
				return Reflect.apply(frame, parent, [ func ]);
			},
			proxy: class {
				constructor(input){
					return input;
				}
			},
			get log(){ return cheat.log },
			get err(){ return cheat.err },
			info(data){
				switch(data){
					case'injected':
						
						cheat.log('injected to game');
						
						cheat.log('hiding: ' + cheat.objs.storage + '.' + cheat.rnds.storage, parent[cheat.objs.storage][cheat.rnds.storage]);
						delete parent[cheat.objs.storage][cheat.rnds.storage];
						
						break
				}
			},
		},
		inputs: [],
	};

cheat.raycaster = new three.Raycaster();

values.config = config = JSON.parse(JSON.stringify(values.oconfig));

// REMOVE LATER
// window.cheese = cheat;

// pass storage object to game
cheat.patches.set(/^/, 'return ((ssd, Proxy) => { ');
cheat.patches.set(/$/g, '})(' + cheat.objs.storage + '.' + cheat.rnds.storage + ', ' + cheat.objs.storage + '.' + cheat.rnds.storage + '.proxy);');

setInterval(cheat.process_interval, 500);

// load cheat font
new FontFace('Inconsolata', 'url("https://fonts.gstatic.com/s/inconsolata/v20/QldgNThLqRwH-OJ1UHjlKENVzkWGVkL3GZQmAwLYxYWI2qfdm7Lpp4U8WR32lw.woff2")', {
	family: 'Inconsolata',
	style: 'normal',
	weight: 400,
	stretch: '100%',
	unicodeRange: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
}).load().then(font => parent.document.fonts.add(font));



cheat.wf(() => parent.document && parent.document.body).then(() => ui.init('Shitsploit', 'Press [F1] or [C] to toggle menu', [{
	name: 'Main',
	contents: [{
		name: 'Auto aim',
		type: 'bool_rot',
		val_get: _ => values.config.aim.status,
		val_set: v => values.config.aim.status = v,
		vals: [{
			val: 'off',
			display: 'Off',
		},{
			val: 'triggerbot',
			display: 'Triggerbot',
		},{
			val: 'assist',
			display: 'Assist',
		},{
			val: 'silent',
			display: 'Silent',
		}],
		get key(){ return values.config.kb.aim || values.oconfig.kb.aim; },
	},{
		name: 'Auto bhop',
		type: 'bool_rot',
		val_get: _ => values.config.game.bhop,
		val_set: v => values.config.game.bhop = v,
		vals: [{
			val: 'off',
			display: 'Off',
		},{
			val: 'keyjump',
			display: 'Key jump',
		},{
			val: 'keyslide',
			display: 'Key slide',
		},{
			val: 'autoslide',
			display: 'Auto slide',
		},{
			val: 'autojump',
			display: 'Auto jump',
		}],
		get key(){ return values.config.kb.bhop || values.oconfig.kb.bhop; },
	},{
		name: 'ESP mode',
		type: 'bool_rot',
		val_get: _ => values.config.esp.status,
		val_set: v => values.config.esp.status = v,
		vals: [{
			val: 'off',
			display: 'Off',
		},{
			val: 'box',
			display: 'Box',
		},{
			val: 'chams',
			display: 'Chams',
		},{
			val: 'box_chams',
			display: 'Box & chams',
		},{
			val: 'full',
			display: 'Full',
		}],
		get key(){ return values.config.kb.esp || values.oconfig.kb.esp; },
	},{
		name: 'Tracers',
		type: 'bool',
		val_get: _ => values.config.esp.tracers,
		val_set: v => values.config.esp.tracers = v,
		get key(){ return values.config.kb.tracers || values.oconfig.kb.tracers; },
	},{
		name: 'Nametags',
		type: 'bool',
		val_get: _ => values.config.esp.nametags,
		val_set: v => values.config.esp.nametags = v,
		get key(){ return values.config.kb.nametags || values.oconfig.kb.nametags; },
	},{
		name: 'Overlay',
		type: 'bool',
		val_get: _ => values.config.game.overlay,
		val_set: v => values.config.game.overlay = v,
		get key(){ return values.config.kb.overlay || values.oconfig.kb.overlay; },
	}],
},{
	name: 'Game',
	contents: [{
		name: 'You need to be signed in for the skin hack',
		type: 'text-small',
	},{
		name: 'Skins',
		type: 'bool',
		val_get: _ => values.config.game.skins,
		val_set: v => values.config.game.skins = v,
		key: 'unset',
	},{
		name: 'Wireframe',
		type: 'bool',
		val_get: _ => values.config.game.wireframe,
		val_set: v => values.config.game.wireframe = v,
		key: 'unset',
	},{
		name: 'Auto respawn',
		type: 'bool',
		val_get: _ => values.config.game.auto_respawn,
		val_set: v => values.config.game.auto_respawn = v,
		key: 'unset',
	}],
},{
	name: 'Aim',
	contents: [{
		name: 'Target sorting',
		type: 'bool_rot',
		val_get: _ => values.config.game.target_sorting,
		val_set: v => values.config.game.target_sorting = v,
		vals: [{
			val: 'dist2d',
			display: 'Distance (2D)',
		},{
			val: 'dist3d',
			display: 'Distance (3D)',
		},{
			val: 'hp',
			display: 'Health',
		}],
		key: 'unset',
	},{
		name: 'Smoothness',
		type: 'slider',
		val_get: _ => values.config.aim.smoothn,
		val_set: v => values.config.aim.smoothn = v,
		min_val: 0,
		max_val: 50,
		unit: 10,
	},{
		name: 'Smooth',
		type: 'bool',
		val_get: _ => values.config.aim.smooth,
		val_set: v => values.config.aim.smooth = v,
		key: 'unset',
	},{
		name: 'Auto reload',
		type: 'bool',
		val_get: _ => values.config.aim.auto_reload,
		val_set: v => values.config.aim.auto_reload = v,
		key: 'unset',
	},{
		name: 'Sight check',
		type: 'bool',
		val_get: _ => values.config.aim.frustrum_check,
		val_set: v => values.config.aim.frustrum_check = v,
		key: 'unset',
	},{
		name: 'Wallbangs',
		type: 'bool',
		val_get: _ => values.config.aim.wallbangs,
		val_set: v => values.config.aim.wallbangs = v,
		key: 'unset',
	}],
},{
	name: 'Esp',
	contents: [{
		name: 'Minimap',
		type: 'bool',
		val_get: _ => values.config.esp.minimap,
		val_set: v => values.config.esp.minimap = v,
		key: 'unset',
	},{
		name: 'Health bars',
		type: 'bool',
		val_get: _ => values.config.esp.health_bars,
		val_set: v => values.config.esp.health_bars = v,
		key: 'unset',
	},{
		name: 'Walls',
		type: 'bool',
		val_get: _ => values.config.esp.walls,
		val_set: v => values.config.esp.walls = v,
		key: 'unset',
	},{
		name: 'Wall opacity',
		type: 'slider',
		val_get: _ => values.config.esp.wall_opac,
		val_set: v => values.config.esp.wall_opac = v,
		min_val: 0.1,
		max_val: 1,
		unit: 1,
	}]
},{
	name: 'Settings',
	contents: [{
		name: 'Join the Discord',
		type: 'function_inline',
		key: 'unset',
		val(){
			window.open('https://e9x.github.io/kru/inv/');
		},
	},{
		name: 'Reset settings',
		type: 'function_inline',
		val: _ => (values.config = Object.assign({}, values.oconfig), ui.reload(), ui.sync_config('update')),
		key: 'unset',
	}],
}]));

ui.sync_config('load');
inject(cheat);