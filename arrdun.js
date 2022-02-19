jQuery('document').ready(() => {
    
    const $ =  jQuery;
    
    const [
        
        PR_ELEM, PR_GAME, PR_SEED, PR_PRNG,
        PR_TAB_SIZE, PR_SEQ_LEN,
        PR_AB_TAB, PR_AB_SEQ, PR_AB_PAD, PR_AB_ANIMDUR,
        PR_TOK_DONE, PR_TOK_CNT,
        PL_TOK_CACHE, PL_REC,
        FLG_AB_BUSSY,
        
        MTD_NEW_ELEM, MTD_NEW_PAD,
        MTD_NEW_UNIT, MTD_NEW_TAB,
        MTD_GETUNIT, MTD_GETTOK, MTD_DIST,
        MTD_GETSEQ, MTD_SHIFTSEQ, MTD_FIND_TAB,
        MTD_UPDATE_MTAB, MTD_UPDATE_SCORE,
        MTD_ON_TAP, MTD_ON_UNDO,
        MTD_INIT_SYMS, MTD_TOKDIR,
        MTD_REC_PUSH, MTD_REC_POP,
        
    ] = (function*() {
        while(true) {
            yield Symbol();
        }
    })();
    
    const
        CALLABLE = (f) => f instanceof Function,
        RLIM = (v, a, b) => Math.max(a, Math.min(b, v)),
        ELEM = (cls, id, etag = 'div') => {
            let e = $('<'+etag+'>');
            if(cls) {
                e = e.addClass(cls);
            }
            if(id) {
                e = e.attr('id', id);
            }
            return e;
        };
    
    class c_board {
        
        constructor(game, slen) {
            this[MTD_INIT_SYMS]();
            this[PR_GAME] = game;
            this[PR_TAB_SIZE] = game.size;
            this[PR_SEQ_LEN] = slen;
            this[PR_AB_ANIMDUR] = 200;
            this[FLG_AB_BUSSY] = false;
        }
        
        [MTD_INIT_SYMS]() {
            this.sym_undo = '\u238c';
            this.sym_inf = '\u221e';
        }
        
        [MTD_NEW_ELEM]() {
            let elem = ELEM('ars_board', 'ar_board');
            let pdelem = this[MTD_NEW_PAD]();
            let [mtelem, mtab] = this[MTD_NEW_TAB]('main', this[PR_TAB_SIZE], true);
            this[PR_AB_TAB] = mtab;
            elem.append(pdelem).append(mtelem);
            return elem;
        }
        
        [MTD_NEW_PAD]() {
            let elem = ELEM('ars_pad', 'ar_pad');
            let cnsl = ELEM('ars_pad_console', 'ar_pad_console');
            let toknum = ELEM('ars_tokleft', 'ar_tokleft');
            let undo = ELEM('ars_pad_button', 'ar_undo').text(this.sym_undo);
            undo.on('tap', e => this[MTD_ON_UNDO]());
            cnsl.append(toknum, undo);
            let [tokseq, stab] = this[MTD_NEW_TAB]('tokseq', [this[PR_SEQ_LEN], 1]);
            this[PR_AB_SEQ] = stab;
            elem.append(cnsl, tokseq);
            this[PR_AB_PAD] = elem;
            return elem;
        }
        
        [MTD_NEW_UNIT](tok) {
            let uelem = ELEM('ars_unit');
            uelem.text(tok);
            let ttyp = this[PR_GAME].toktype(tok);
            if(['char', 'done'].includes(ttyp)) {
                uelem.addClass('ars_utyp_' + ttyp);
            }
            return uelem;
        }
        
        [MTD_NEW_TAB](name, size, tap = false) {
            let id = 'ar_tab_' + name;
            let [sw, sh] = size;
            let elem = ELEM('ars_tab', id, 'table');
            let tab = [];
            for(let y = 0; y < sh; y++) {
                let relem = ELEM('ars_row', null, 'tr');
                elem.append(relem);
                let row = [];
                tab.push(row);
                for(let x = 0; x < sw; x++) {
                    let celem = ELEM('ars_cell', null, 'td');;
                    if(tap) {
                        celem.on('tap', e => this[MTD_ON_TAP]([x, y]));
                    }
                    relem.append(celem);
                    let v = this[PR_GAME].init_tok(name, [x, y]);
                    let uelem = this[MTD_NEW_UNIT](v);
                    celem.append(uelem);
                    row.push(celem);
                }
            }
            return [elem, tab];
        }
        
        get elem() {
            if(!this[PR_ELEM]) {
                this[PR_ELEM] = this[MTD_NEW_ELEM]();
            }
            return this[PR_ELEM];
        }
        
        async start() {
            this[FLG_AB_BUSSY] = true;
            this[MTD_UPDATE_SCORE]();
            await this[MTD_UPDATE_MTAB]();
            this[FLG_AB_BUSSY] = false;
        }
        
        [MTD_GETUNIT](celem) {
            //return celem.find('.ars_unit');
            return celem.children(0);
        }
        
        [MTD_GETTOK](uelem) {
            return uelem?.text?.() ?? null;
        }
        
        [MTD_DIST](e1, e2) {
            if(!e1 || !e2) {
                return [0, 0];
            }
            let {left: left1, top: top1} = e1.offset();
            let {left: left2, top: top2} = e2.offset();
            return [left2 - left1, top2 - top1];
        }
        
        [MTD_GETSEQ](tab, spos, dir) {
            let th = tab.length;
            let tw = tab[0].length;
            let [sx, sy] = spos;
            let [dx, dy] = dir;
            let [ox, oy] = [0, 0];
            if(dx && dy) {
                throw Error('invalid direct');
            } else if(dx) {
                ox = -Math.sign(dx);
                sx = RLIM(sx + dx, 0, tw - 1);
                dx = RLIM(sx + ox * Infinity, 0, tw - 1);
                dy = sy;
            } else if(dy) {
                oy = -Math.sign(dy);
                sy = RLIM(sy + dy, 0, th - 1);
                dy = RLIM(sy + oy * Infinity, 0, th - 1);
                dx = sx;
            }
            let seq = [tab[sy][sx]];
            while(sx != dx || sy != dy) {
                sx += ox;
                sy += oy;
                seq.push(tab[sy][sx]);
            }
            return seq;
        }
        
        async [MTD_SHIFTSEQ](seq, extra = null,
            cb_take = null, cb_put = null,
            acb_shift = null, acb_hide = null, acb_show = null) {
            let loop = !extra;
            let slen = seq.length;
            let shift_seq = [];
            if(loop) {
                shift_seq.push([seq[slen - 1], seq[0]]);
            }
            for(let i = 0; i < slen - 1; i++) {
                shift_seq.push([seq[i], seq[i + 1]]);
            }
            let prms = [];
            if(!loop && CALLABLE(acb_hide)) {
                prms.push(acb_hide(seq[0]));
            }
            if(CALLABLE(acb_shift)) {
                for(let [d, s] of shift_seq) {
                    prms.push(acb_shift(d, s));
                }
            }
            if(prms.length > 0) {
                await Promise.all(prms);
            }
            if(CALLABLE(cb_take) && CALLABLE(cb_put)) {
                let first = null;
                let last = null;
                if(loop) {
                    shift_seq.pop();
                }
                for(let [d, s] of shift_seq) {
                    if(first === null) {
                        first = cb_take(d, true);
                    }
                    cb_put(d, cb_take(s, false), false);
                    last = s;
                }
                if(last) {
                    if(!loop) {
                        first = extra;
                    }
                    cb_put(last, first, true);
                }
            }
            if(!loop && CALLABLE(acb_show)) {
                await acb_show(extra);
            }
        }
        
        async shift(spos, dir, extra = null, rvs = false, dur = null) {
            dur = dur ?? this[PR_AB_ANIMDUR];
            let pushed = ((extra ?? null) !== null);
            if(!pushed) {
                dir = dir.map(v => v ? v * Infinity : 0);
            }
            let sseq = this[MTD_GETSEQ](this[PR_AB_TAB], spos, dir);
            if(pushed) {
                sseq = sseq.concat(
                    this[MTD_GETSEQ](this[PR_AB_SEQ], [1, 0], [-1, 0])
                );
            }
            if(rvs) {
                sseq.reverse();
            }
            let first = null;
            let exelem = null;
            if(pushed) {
                exelem = this[MTD_NEW_UNIT](extra);
                exelem.hide(0);
            }
            await this[MTD_SHIFTSEQ](sseq, exelem,
                (celem, isfirst) => {
                    let uelem = this[MTD_GETUNIT](celem);
                    uelem.remove();
                    if(pushed && isfirst) {
                        first = uelem;
                    }
                    return uelem;
                }, (celem, uelem, islast) => {
                    if(pushed && islast) {
                        //pass
                    }
                    uelem.css({'left': '', 'top': ''});
                    //console.log(uelem.text(), '->', celem[0]);
                    celem.append(uelem);
                }, async (dcel, scel) => {
                    let du = this[MTD_GETUNIT](dcel);
                    let su = this[MTD_GETUNIT](scel);
                    let [dx, dy] = this[MTD_DIST](su, du);
                    await su.animate({left: '+=' + dx, top: '+=' + dy}, dur).promise();
                }, async cel => {
                    await this[MTD_GETUNIT](cel).hide('fade', dur).promise();
                }, async uel => {
                    await uel.show('fade', dur).promise();
                },
            );
            return this[MTD_GETTOK](first);
        }
        
        [MTD_FIND_TAB](tab, tok) {
            let rlen = tab.length;
            for(let y = 0; y < rlen; y++) {
                let row = tab[y];
                let clen = row.length;
                for(let x = 0; x < clen; x++) {
                    let celem = row[x];
                    let ctok = this[MTD_GETTOK](this[MTD_GETUNIT](celem));
                    if(ctok === tok) {
                        return [x, y];
                    }
                }
            }
            return [-1, -1];
        }
        
        async [MTD_UPDATE_MTAB](dur = null) {
            dur = dur ?? this[PR_AB_ANIMDUR];
            let tab = this[PR_AB_TAB];
            let seq = this[PR_AB_SEQ][0];
            let prms = [];
            let spos = this[MTD_FIND_TAB](tab, this[PR_GAME].sym_char);
            let rlen = tab.length;
            let utyps = ['forward', 'backward', 'sideward'];
            let s_utyps = utyps.map(v=>'ars_utyp_'+v).join(' ');
            for(let y = 0; y < rlen; y++) {
                let row = tab[y];
                let clen = row.length;
                for(let x = 0; x < clen; x++) {
                    let celem = row[x];
                    let uelem = this[MTD_GETUNIT](celem);
                    let ctok = this[MTD_GETTOK](uelem);
                    let dir = [x - spos[0], y - spos[1]];
                    let ttyp = this[PR_GAME].toktype(ctok, dir);
                    let uti = utyps.indexOf(ttyp);
                    if(uti >= 0) {
                        prms.push(
                            uelem.switchClass(
                                utyps.map(v=>v===ttyp?'':'ars_utyp_'+v).join(' '),
                                'ars_utyp_' + ttyp, dur).promise()
                        );
                    } else {
                        prms.push(
                            uelem.removeClass(s_utyps, dur).promise()
                        );
                    }
                }
            }
            for(let celem of seq) {
                let uelem = this[MTD_GETUNIT](celem);
                prms.push(
                    uelem.removeClass(s_utyps, dur).promise()
                );
            }
            await Promise.all(prms);
        }
        
        [MTD_UPDATE_SCORE]() {
            let tl = Math.max(0, this[PR_GAME].tokleft + this[PR_SEQ_LEN] + 1);
            this[PR_AB_PAD].find('#ar_tokleft').text(tl > 0 ? tl : this.sym_inf);
        }
        
        async [MTD_ON_TAP](pos) {
            if(this[FLG_AB_BUSSY]) {
                return;
            }
            this[FLG_AB_BUSSY] = true;
            let spos = this[MTD_FIND_TAB](this[PR_AB_TAB], this[PR_GAME].sym_char);
            if(!(await this[PR_GAME].move(this, spos, pos))) {
                this[FLG_AB_BUSSY] = false;
                return;
            }
            this[MTD_UPDATE_SCORE]();
            await this[MTD_UPDATE_MTAB]();
            this[FLG_AB_BUSSY] = false;
        }
        
        async [MTD_ON_UNDO]() {
            if(this[FLG_AB_BUSSY]) {
                return;
            }
            this[FLG_AB_BUSSY] = true;
            if(!(await this[PR_GAME].undo(this))) {
                this[FLG_AB_BUSSY] = false;
                return;
            }
            this[MTD_UPDATE_SCORE]();
            await this[MTD_UPDATE_MTAB]();
            this[FLG_AB_BUSSY] = false;
        }
        
        peek(pos) {
            let [x, y] = pos;
            let celem = this[PR_AB_TAB][y]?.[x];
            if(!celem) {
                return null;
            }
            return this[MTD_GETTOK](this[MTD_GETUNIT](celem));
        }
        
    }
    
    class c_arrdun {
        
        constructor(size, toknum, seed) {
            this[MTD_INIT_SYMS]();
            this[PR_TAB_SIZE] = size;
            this[PR_TOK_DONE] = toknum;
            this[PR_SEED] = seed;
            this.reset();
        }
        
        reset() {
            this[PR_PRNG] = PRNG(this[PR_SEED]);
            this[PL_TOK_CACHE] = [];
            this[PR_TOK_CNT] = 0;
            this[PL_REC] = [];
            return this;
        }
        
        get size() {
            return this[PR_TAB_SIZE];
        }
        
        get tokleft() {
            return this[PR_TOK_DONE] - this[PR_TOK_CNT];
        }
        
        [MTD_INIT_SYMS]() {
            this.sym_char = '@';
            this.sym_dir = ['\u21e8', '\u21e9', '\u21e6', '\u21e7'];
            this.sym_done = '*';
        }
        
        [MTD_TOKDIR](tok, rvs = false) {
            let ti = this.sym_dir.indexOf(tok);
            if(ti < 0) {
                return null;
            }
            let dx = ((ti + 1) % 2) * (1 - ti);
            let dy = (ti % 2) * (2 - ti);
            if(rvs) {
                return [-dx, -dy];
            } else {
                return [dx, dy];
            }
        }
        
        take_tok() {
            if(this[PL_TOK_CACHE].length > 0) {
                this[PR_TOK_CNT] ++;
                return this[PL_TOK_CACHE].pop();
            } else if(this[PR_TOK_CNT]++ === this[PR_TOK_DONE]) {
                return this.sym_done;
            }
            let rnd = Math.floor(this[PR_PRNG]() * 4);
            return this.sym_dir[rnd];
        }
        
        putback_tok(tok) {
            if(this[PR_TOK_CNT] === 0) {
                throw Error('putback failed');
            }
            this[PR_TOK_CNT] --;
            this[PL_TOK_CACHE].push(tok);
        }
        
        init_tok(tabname, pos) {
            let [x, y] = pos;
            let [w, h] = this[PR_TAB_SIZE];
            if(tabname === 'main') {
                let cx = Math.floor(w / 2);
                let cy = Math.floor(h / 2);
                if(x === cx && y === cy ) {
                    return this.sym_char;
                } else if(x === cx && Math.abs(y - cy) === 1) {
                    return this.sym_dir[cy - y + 2];
                } else if(y === cy && Math.abs(x - cx) === 1) {
                    return this.sym_dir[cx - x + 1];
                } else {
                    return this.take_tok();
                }
            } else {
                return this.take_tok();
            }
        }
        
        toktype(tok, dir) {
            if(tok === this.sym_char) {
                return 'char';
            } else if(tok === this.sym_done) {
                return 'done';
            } else if(dir) {
                let [dx, dy] = dir;
                let tokdir = this[MTD_TOKDIR](tok);
                if(!tokdir) {
                    return 'others';
                }
                if(Math.abs(dx) + Math.abs(dy) !== 1) {
                    return 'range';
                }
                let [tx, ty] = tokdir;
                if(tx === dx && ty === dy) {
                    return 'forward';
                } else if(tx === -dx || ty === -dy) {
                    return 'backward';
                } else {
                    return 'sideward';
                }
            } else {
                return 'unknown';
            }
        }
        
        [MTD_REC_PUSH](...args) {
            this[PL_REC].push(args);
        }
        
        [MTD_REC_POP]() {
            if(this[PL_REC].length === 0) {
                return [];
            }
            return this[PL_REC].pop();
        }
        
        async move(bd, spos, dpos) {
            let tok = bd.peek(dpos);
            if(!tok) {
                return false;
            }
            let dir = [dpos[0] - spos[0], dpos[1] - spos[1]];
            let ttyp = this.toktype(tok, dir);
            if(ttyp === 'forward') {
                let ntok = this.take_tok();
                let otok = await bd.shift(spos, dir, ntok);
                this[MTD_REC_PUSH](ttyp, spos, dir, ntok, otok);
            } else if(ttyp === 'sideward') {
                await bd.shift(spos, dir);
                this[MTD_REC_PUSH](ttyp, spos, dir);
            } else {
                return false;
            }
            return true;
        }
        
        async undo(bd) {
            let [ttyp, spos, dir, ...rm] = this[MTD_REC_POP]();
            if(!ttyp) {
                return false;
            } else if(ttyp === 'forward') {
                let [ntok, otok] = rm;
                let pbtok = await bd.shift(spos, dir, otok, true);
                this.putback_tok(pbtok);
            } else if(ttyp === 'sideward') {
                await bd.shift(spos, dir, null, true);
            } else {
                return false;
            }
            return true;
        }
        
        save() {
            return {
                size: this[PR_TAB_SIZE],
                tokd: this[PR_TOK_DONE],
                seed: this[PR_SEED],
                recs: this[PL_REC].slice(),
            };
        }
        
        async load(bd, data) {
            let {size, tokd, seed, recs} = data;
            if(this[PL_REC].length > 0
                || this[PR_SEED] !== seed
                || this[PR_TAB_SIZE][0] !== size[0]
                || this[PR_TAB_SIZE][1] !== size[1]
                || this[PR_TOK_DONE] !== tokd) {
                return false;
            }
            for(let [ttyp, spos, dir, ...rm] of recs) {
                if(ttyp === 'forward') {
                    let [ntok, otok] = rm;
                    let potok = await bd.shift(spos, dir, ntok);
                    if(otok !== potok) {
                        throw Error('unmatch record');
                    }
                    this[MTD_REC_PUSH](ttyp, spos, dir, ntok, otok);
                } else if(ttyp === 'sideward') {
                    await bd.shift(spos, dir);
                    this[MTD_REC_PUSH](ttyp, spos, dir);
                }
            }
            return true;
        }
        
    }
    
    const scene = ELEM('ars_scene', 'ar_scene');
    /*const*/ game = new c_arrdun([3, 3], 16, 'hello world');
    /*const*/ board = new c_board(game, 3);
    scene.append(board.elem);
    board.start();
    $('#main').append(scene);
    
});