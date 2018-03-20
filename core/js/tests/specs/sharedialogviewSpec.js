/**
* ownCloud
*
* @author Vincent Petry
* @copyright 2015 Vincent Petry <pvince81@owncloud.com>
*
* This library is free software; you can redistribute it and/or
* modify it under the terms of the GNU AFFERO GENERAL PUBLIC LICENSE
* License as published by the Free Software Foundation; either
* version 3 of the License, or any later version.
*
* This library is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU AFFERO GENERAL PUBLIC LICENSE for more details.
*
* You should have received a copy of the GNU Affero General Public
* License along with this library.  If not, see <http://www.gnu.org/licenses/>.
*
*/

/* global oc_appconfig, sinon */
describe('OC.Share.ShareDialogView', function() {
	var $container;
	var oldAppConfig;
	var autocompleteStub;
	var avatarStub;
	var placeholderStub;
	var oldCurrentUser;
	var saveLinkShareStub;

	var fetchStub;

	var configModel;
	var shareModel;
	var fileInfoModel;
	var dialog;

	beforeEach(function() {
		// horrible parameters
		$('#testArea').append('<input id="allowShareWithLink" type="hidden" value="yes">');
		$container = $('#shareContainer');
		/* jshint camelcase:false */
		oldAppConfig = _.extend({}, oc_appconfig.core);
		oc_appconfig.core.enforcePasswordForPublicLink = false;

		fetchStub = sinon.stub(OC.Share.ShareItemModel.prototype, 'fetch');
		saveLinkShareStub = sinon.stub(OC.Share.ShareItemModel.prototype, 'saveLinkShare');

		fileInfoModel = new OCA.Files.FileInfoModel({
			id: 123,
			name: 'shared_file_name.txt',
			path: '/subdir',
			size: 100,
			mimetype: 'text/plain',
			permissions: 31,
			sharePermissions: 31
		});

		var attributes = {
			itemType: fileInfoModel.isDirectory() ? 'folder' : 'file',
			itemSource: fileInfoModel.get('id'),
			possiblePermissions: 31,
			permissions: 31
		};
		configModel = new OC.Share.ShareConfigModel({
			enforcePasswordForPublicLink: false,
			isResharingAllowed: true,
			isDefaultExpireDateEnabled: false,
			isDefaultExpireDateEnforced: false,
			defaultExpireDate: 7
		});
		shareModel = new OC.Share.ShareItemModel(attributes, {
			configModel: configModel,
			fileInfoModel: fileInfoModel
		});
		dialog = new OC.Share.ShareDialogView({
			configModel: configModel,
			model: shareModel
		});

		// required for proper event propagation when simulating clicks in some cases (jquery bugs)
		$('#testArea').append(dialog.$el);

		// triggers rendering
		shareModel.set({
			shares: [],
			linkShare: {isLinkShare: false}
		});

		autocompleteStub = sinon.stub($.fn, 'autocomplete').callsFake(function() {
			// dummy container with the expected attributes
			if (!$(this).length) {
				// simulate the real autocomplete that returns
				// nothing at all when no element is specified
				// (and potentially break stuff)
				return null;
			}
			var $el = $('<div></div>').data('ui-autocomplete', {});
			return $el;
		});

		avatarStub = sinon.stub($.fn, 'avatar');
		placeholderStub = sinon.stub($.fn, 'imageplaceholder');

		oldCurrentUser = OC.currentUser;
		OC.currentUser = 'user0';
	});
	afterEach(function() {
		OC.currentUser = oldCurrentUser;
		/* jshint camelcase:false */
		oc_appconfig.core = oldAppConfig;

		dialog.remove();
		fetchStub.restore();
		saveLinkShareStub.restore();

		autocompleteStub.restore();
		avatarStub.restore();
		placeholderStub.restore();
	});
	describe('Share with link', function() {
		// TODO: test ajax calls
		// TODO: test password field visibility (whenever enforced or not)
		it('update password on focus out', function() {
			$('#allowShareWithLink').val('yes');

			dialog.model.set('linkShare', {
				isLinkShare: true
			});
			dialog.render();

			// Enable password, enter password and focusout
			dialog.$el.find('[name=showPassword]').click();
			dialog.$el.find('.linkPassText').focus();
			dialog.$el.find('.linkPassText').val('foo');
			dialog.$el.find('.linkPassText').focusout();

			expect(saveLinkShareStub.calledOnce).toEqual(true);
			expect(saveLinkShareStub.firstCall.args[0]).toEqual({
				password: 'foo'
			});
		});
		it('update password on enter', function() {
			$('#allowShareWithLink').val('yes');

			dialog.model.set('linkShare', {
				isLinkShare: true
			});
			dialog.render();

			// Toggle linkshare
			dialog.$el.find('.linkCheckbox').click();

			// Enable password and enter password
			dialog.$el.find('[name=showPassword]').click();
			dialog.$el.find('.linkPassText').focus();
			dialog.$el.find('.linkPassText').val('foo');
			dialog.$el.find('.linkPassText').trigger(new $.Event('keyup', {keyCode: 13}));

			expect(saveLinkShareStub.calledOnce).toEqual(true);
			expect(saveLinkShareStub.firstCall.args[0]).toEqual({
				password: 'foo'
			});
		});
		it('shows share with link checkbox when allowed', function() {
			$('#allowShareWithLink').val('yes');

			dialog.render();

			expect(dialog.$el.find('.linkCheckbox').length).toEqual(1);
		});
		it('does not show share with link checkbox when not allowed', function() {
			$('#allowShareWithLink').val('no');

			dialog.render();

			expect(dialog.$el.find('.linkCheckbox').length).toEqual(0);
			expect(dialog.$el.find('.shareWithField').length).toEqual(1);
		});
		it('shows populated link share when a link share exists', function() {
			// this is how the OC.Share class does it...
			var link = parent.location.protocol + '//' + location.host +
				OC.generateUrl('/s/') + 'tehtoken';
			shareModel.set('linkShare', {
				isLinkShare: true,
				token: 'tehtoken',
				link: link,
				expiration: '',
				permissions: OC.PERMISSION_READ,
				stime: 1403884258,
			});

			dialog.render();

			expect(dialog.$el.find('.linkCheckbox').prop('checked')).toEqual(true);
			expect(dialog.$el.find('.linkText').val()).toEqual(link);
		});
		it('autofocus link text when clicked', function() {
			$('#allowShareWithLink').val('yes');

			dialog.model.set('linkShare', {
				isLinkShare: true
			});
			dialog.render();

			var focusStub = sinon.stub($.fn, 'focus');
			var selectStub = sinon.stub($.fn, 'select');
			dialog.$el.find('.linkText').click();

			expect(focusStub.calledOnce).toEqual(true);
			expect(selectStub.calledOnce).toEqual(true);

			focusStub.restore();
			selectStub.restore();
		});
		describe('password', function() {
			var slideToggleStub;

			beforeEach(function() {
				$('#allowShareWithLink').val('yes');
				configModel.set({
					enforcePasswordForPublicLink: false
				});

				slideToggleStub = sinon.stub($.fn, 'slideToggle');
			});
			afterEach(function() {
				slideToggleStub.restore();
			});

			it('enforced but toggled does not fire request', function() {
				configModel.set('enforcePasswordForPublicLink', true);
				dialog.render();

				dialog.$el.find('.linkCheckbox').click();

				// The password linkPass field is shown (slideToggle is called).
				// No request is made yet
				expect(slideToggleStub.callCount).toEqual(1);
				expect(slideToggleStub.getCall(0).thisValue.eq(0).attr('id')).toEqual('linkPass');
				expect(fakeServer.requests.length).toEqual(0);

				// Now untoggle share by link
				dialog.$el.find('.linkCheckbox').click();
				dialog.render();

				// Password field disappears and no ajax requests have been made
				expect(fakeServer.requests.length).toEqual(0);
				expect(slideToggleStub.callCount).toEqual(2);
				expect(slideToggleStub.getCall(1).thisValue.eq(0).attr('id')).toEqual('linkPass');
			});
		});
		describe('expiration date', function() {
			var shareData;
			var shareItem;
			var clock;
			var expectedMinDate;

			beforeEach(function() {
				// pick a fake date
				clock = sinon.useFakeTimers(new Date(2014, 0, 20, 14, 0, 0).getTime());
				expectedMinDate = new Date(2014, 0, 21, 14, 0, 0);

				configModel.set({
					enforcePasswordForPublicLink: false,
					isDefaultExpireDateEnabled: false,
					isDefaultExpireDateEnforced: false,
					defaultExpireDate: 7
				});

				shareModel.set('linkShare', {
					isLinkShare: true,
					token: 'tehtoken',
					permissions: OC.PERMISSION_READ,
					expiration: null
				});
			});
			afterEach(function() {
				clock.restore();
			});

			it('does not check expiration date checkbox when no date was set', function() {
				shareModel.get('linkShare').expiration = null;
				dialog.render();

				expect(dialog.$el.find('[name=expirationCheckbox]').prop('checked')).toEqual(false);
				expect(dialog.$el.find('.datepicker').val()).toEqual('');
			});
			it('does not check expiration date checkbox for new share', function() {
				dialog.render();

				expect(dialog.$el.find('[name=expirationCheckbox]').prop('checked')).toEqual(false);
				expect(dialog.$el.find('.datepicker').val()).toEqual('');
			});
			it('checks expiration date checkbox and populates field when expiration date was set', function() {
				shareModel.get('linkShare').expiration = '2014-02-01 00:00:00';
				dialog.render();
				expect(dialog.$el.find('[name=expirationCheckbox]').prop('checked')).toEqual(true);
				expect(dialog.$el.find('.datepicker').val()).toEqual('01-02-2014');
			});
			it('sets default date when default date setting is enabled', function() {
				configModel.set('isDefaultExpireDateEnabled', true);
				dialog.render();
				dialog.$el.find('.linkCheckbox').click();
				// here fetch would be called and the server returns the expiration date
				shareModel.get('linkShare').expiration = '2014-1-27 00:00:00';
				dialog.render();

				// enabled by default
				expect(dialog.$el.find('[name=expirationCheckbox]').prop('checked')).toEqual(true);
				expect(dialog.$el.find('.datepicker').val()).toEqual('27-01-2014');

				// disabling is allowed
				dialog.$el.find('[name=expirationCheckbox]').click();
				expect(dialog.$el.find('[name=expirationCheckbox]').prop('checked')).toEqual(false);
			});
			it('enforces default date when enforced date setting is enabled', function() {
				configModel.set({
					isDefaultExpireDateEnabled: true,
					isDefaultExpireDateEnforced: true
				});
				dialog.render();
				dialog.$el.find('.linkCheckbox').click();
				// here fetch would be called and the server returns the expiration date
				shareModel.get('linkShare').expiration = '2014-1-27 00:00:00';
				dialog.render();

				expect(dialog.$el.find('[name=expirationCheckbox]').prop('checked')).toEqual(true);
				expect(dialog.$el.find('.datepicker').val()).toEqual('27-01-2014');

				// disabling is not allowed
				expect(dialog.$el.find('[name=expirationCheckbox]').prop('disabled')).toEqual(true);
				dialog.$el.find('[name=expirationCheckbox]').click();
				expect(dialog.$el.find('[name=expirationCheckbox]').prop('checked')).toEqual(true);
			});
			it('enforces default date when enforced date setting is enabled and password is enforced', function() {
				configModel.set({
					enforcePasswordForPublicLink: true,
					isDefaultExpireDateEnabled: true,
					isDefaultExpireDateEnforced: true
				});
				dialog.render();
				dialog.$el.find('.linkCheckbox').click();
				// here fetch would be called and the server returns the expiration date
				shareModel.get('linkShare').expiration = '2014-1-27 00:00:00';
				dialog.render();

				//Enter password
				dialog.$el.find('.linkPassText').val('foo');
				dialog.$el.find('.linkPassText').trigger(new $.Event('keyup', {keyCode: 13}));
				fakeServer.requests[0].respond(
					200,
					{ 'Content-Type': 'application/json' },
					JSON.stringify({data: {token: 'xyz'}, status: 'success'})
				);

				expect(dialog.$el.find('[name=expirationCheckbox]').prop('checked')).toEqual(true);
				expect(dialog.$el.find('.datepicker').val()).toEqual('27-01-2014');

				// disabling is not allowed
				expect(dialog.$el.find('[name=expirationCheckbox]').prop('disabled')).toEqual(true);
				dialog.$el.find('[name=expirationCheckbox]').click();
				expect(dialog.$el.find('[name=expirationCheckbox]').prop('checked')).toEqual(true);
			});
			it('sets picker minDate to today and no maxDate by default', function() {
				dialog.render();
				dialog.$el.find('.linkCheckbox').click();
				dialog.$el.find('[name=expirationCheckbox]').click();
				expect($.datepicker._defaults.minDate).toEqual(expectedMinDate);
				expect($.datepicker._defaults.maxDate).toEqual(null);
			});
			it('limits the date range to X days after share time when enforced', function() {
				configModel.set({
					isDefaultExpireDateEnabled: true,
					isDefaultExpireDateEnforced: true
				});
				dialog.render();
				dialog.$el.find('.linkCheckbox').click();
				expect($.datepicker._defaults.minDate).toEqual(expectedMinDate);
				expect($.datepicker._defaults.maxDate).toEqual(new Date(2014, 0, 27, 0, 0, 0, 0));
			});
			it('limits the date range to X days after share time when enforced, even when redisplayed the next days', function() {
				// item exists, was created two days ago
				var shareItem = shareModel.get('linkShare');
				shareItem.expiration = '2014-1-27';
				// share time has time component but must be stripped later
				shareItem.stime = new Date(2014, 0, 20, 11, 0, 25).getTime() / 1000;
				configModel.set({
					isDefaultExpireDateEnabled: true,
					isDefaultExpireDateEnforced: true
				});
				dialog.render();
				expect($.datepicker._defaults.minDate).toEqual(expectedMinDate);
				expect($.datepicker._defaults.maxDate).toEqual(new Date(2014, 0, 27, 0, 0, 0, 0));
			});
		});

	});
	describe('check for avatar', function() {
		beforeEach(function() {
			shareModel.set({
				reshare: {
					share_type: OC.Share.SHARE_TYPE_USER,
					uid_owner: 'owner',
					displayname_owner: 'Owner',
					permissions: 31
				},
				shares: [{
					id: 100,
					item_source: 123,
					permissions: 31,
					share_type: OC.Share.SHARE_TYPE_USER,
					share_with: 'user1',
					share_with_displayname: 'User One'
				},{
					id: 101,
					item_source: 123,
					permissions: 31,
					share_type: OC.Share.SHARE_TYPE_GROUP,
					share_with: 'group',
					share_with_displayname: 'group'
				},{
					id: 102,
					item_source: 123,
					permissions: 31,
					share_type: OC.Share.SHARE_TYPE_REMOTE,
					share_with: 'foo@bar.com/baz',
					share_with_displayname: 'foo@bar.com/baz'

				}]
			});
		});

		describe('avatars enabled', function() {
			beforeEach(function() {
				avatarStub.reset();
				dialog.render();
			});

			it('test correct function calls', function() {
				expect(avatarStub.calledTwice).toEqual(true);
				expect(placeholderStub.callCount).toEqual(4);
				expect(dialog.$('.shareWithList').children().length).toEqual(3);
				expect(dialog.$('.avatar').length).toEqual(4);
			});

			it('test avatar owner', function() {
				var args = avatarStub.getCall(0).args;
				expect(args.length).toEqual(2);
				expect(args[0]).toEqual('owner');
			});

			it('test avatar user', function() {
				var args = avatarStub.getCall(1).args;
				expect(args.length).toEqual(6);
				expect(args[0]).toEqual('user1');
				expect(args[5]).toEqual('User One');
			});

			it('test avatar for groups', function() {
				var args = placeholderStub.getCall(0).args;
				expect(args.length).toEqual(1);
				expect(args[0]).toEqual('group ' + OC.Share.SHARE_TYPE_GROUP);
			});

			it('test avatar for remotes', function() {
				var args = placeholderStub.getCall(1).args;
				expect(args.length).toEqual(1);
				expect(args[0]).toEqual('foo@bar.com/baz ' + OC.Share.SHARE_TYPE_REMOTE);
			});
		});
	});
	describe('get suggestions', function() {
		it('no matches', function() {
			var doneStub = sinon.stub();
			var failStub = sinon.stub();

			dialog._getSuggestions('bob', 42, shareModel).done(doneStub).fail(failStub);

			var jsonData = JSON.stringify({
				'ocs': {
					'meta': {
						'status': 'success',
						'statuscode': 100,
						'message': null
					},
					'data': {
						'exact': {
							'users': [],
							'groups': [],
							'remotes': []
						},
						'users': [],
						'groups': [],
						'remotes': [],
						'lookup': []
					}
				}
			});

			expect(doneStub.called).toEqual(false);
			expect(failStub.called).toEqual(false);

			fakeServer.requests[0].respond(
				200,
				{'Content-Type': 'application/json'},
				jsonData
			);

			expect(doneStub.calledOnce).toEqual(true);
			expect(doneStub.calledWithExactly([], [])).toEqual(true);
			expect(failStub.called).toEqual(false);
		});
		it('single partial match', function() {
			var doneStub = sinon.stub();
			var failStub = sinon.stub();

			dialog._getSuggestions('bob', 42, shareModel).done(doneStub).fail(failStub);

			var jsonData = JSON.stringify({
				'ocs': {
					'meta': {
						'status': 'success',
						'statuscode': 100,
						'message': null
					},
					'data': {
						'exact': {
							'users': [],
							'groups': [],
							'remotes': []
						},
						'users': [
							{
								'label': 'bobby',
								'value': {
									'shareType': OC.Share.SHARE_TYPE_USER,
									'shareWith': 'imbob'
								}
							}
						],
						'groups': [],
						'remotes': [],
						'lookup': []
					}
				}
			});

			expect(doneStub.called).toEqual(false);
			expect(failStub.called).toEqual(false);

			fakeServer.requests[0].respond(
				200,
				{'Content-Type': 'application/json'},
				jsonData
			);

			expect(doneStub.calledOnce).toEqual(true);
			expect(doneStub.calledWithExactly([{
				'label': 'bobby',
				'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'imbob'}
			}], [
			])).toEqual(true);
			expect(failStub.called).toEqual(false);
		});
		it('single exact match', function() {
			var doneStub = sinon.stub();
			var failStub = sinon.stub();

			dialog._getSuggestions('bob', 42, shareModel).done(doneStub).fail(failStub);

			var jsonData = JSON.stringify({
				'ocs': {
					'meta': {
						'status': 'success',
						'statuscode': 100,
						'message': null
					},
					'data': {
						'exact': {
							'users': [
								{
									'label': 'bob',
									'value': {
										'shareType': OC.Share.SHARE_TYPE_USER,
										'shareWith': 'user1'
									}
								}
							],
							'groups': [],
							'remotes': []
						},
						'users': [],
						'groups': [],
						'remotes': [],
						'lookup': []
					}
				}
			});

			expect(doneStub.called).toEqual(false);
			expect(failStub.called).toEqual(false);

			fakeServer.requests[0].respond(
				200,
				{'Content-Type': 'application/json'},
				jsonData
			);

			expect(doneStub.calledOnce).toEqual(true);
			expect(doneStub.calledWithExactly([{
				'label': 'bob',
				'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'user1'}
			}], [{
				'label': 'bob',
				'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'user1'}
			}])).toEqual(true);
			expect(failStub.called).toEqual(false);
		});
		it('mixed matches', function() {
			var doneStub = sinon.stub();
			var failStub = sinon.stub();

			dialog._getSuggestions('bob', 42, shareModel).done(doneStub).fail(failStub);

			var jsonData = JSON.stringify({
				'ocs': {
					'meta': {
						'status': 'success',
						'statuscode': 100,
						'message': null
					},
					'data': {
						'exact': {
							'users': [
								{
									'label': 'bob',
									'value': {
										'shareType': OC.Share.SHARE_TYPE_USER,
										'shareWith': 'user1'
									}
								}
							],
							'groups': [
								{
									'label': 'bob',
									'value': {
										'shareType': OC.Share.SHARE_TYPE_GROUP,
										'shareWith': 'group1'
									}
								}
							],
							'remotes': []
						},
						'users': [
							{
								'label': 'bobby',
								'value': {
									'shareType': OC.Share.SHARE_TYPE_USER,
									'shareWith': 'imbob'
								}
							},
							{
								'label': 'bob the second',
								'value': {
									'shareType': OC.Share.SHARE_TYPE_USER,
									'shareWith': 'user2'
								}
							}
						],
						'groups': [
							{
								'label': 'bobfans',
								'value': {
									'shareType': OC.Share.SHARE_TYPE_GROUP,
									'shareWith': 'fans'
								}
							}
						],
						'remotes': [],
						'lookup': []
					}
				}
			});

			expect(doneStub.called).toEqual(false);
			expect(failStub.called).toEqual(false);

			fakeServer.requests[0].respond(
				200,
				{'Content-Type': 'application/json'},
				jsonData
			);

			expect(doneStub.calledOnce).toEqual(true);
			expect(doneStub.calledWithExactly([{
				'label': 'bob',
				'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'user1'}
			}, {
				'label': 'bob',
				'value': {'shareType': OC.Share.SHARE_TYPE_GROUP, 'shareWith': 'group1'}
			}, {
				'label': 'bobby',
				'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'imbob'}
			}, {
				'label': 'bob the second',
				'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'user2'}
			}, {
				'label': 'bobfans',
				'value': {'shareType': OC.Share.SHARE_TYPE_GROUP, 'shareWith': 'fans'}
			}], [{
				'label': 'bob',
				'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'user1'}
			}, {
				'label': 'bob',
				'value': {'shareType': OC.Share.SHARE_TYPE_GROUP, 'shareWith': 'group1'}
			}])).toEqual(true);
			expect(failStub.called).toEqual(false);
		});

		it('does not send a request to the server again for the same parameters', function() {
			var doneStub = sinon.stub();
			var failStub = sinon.stub();

			dialog._getSuggestions('bob', 42, shareModel).done(doneStub).fail(failStub);

			var jsonData = JSON.stringify({
				'ocs': {
					'meta': {
						'status': 'success',
						'statuscode': 100,
						'message': null
					},
					'data': {
						'exact': {
							'users': [
								{
									'label': 'bob',
									'value': {
										'shareType': OC.Share.SHARE_TYPE_USER,
										'shareWith': 'user1'
									}
								}
							],
							'groups': [],
							'remotes': []
						},
						'users': [],
						'groups': [],
						'remotes': [],
						'lookup': []
					}
				}
			});

			expect(doneStub.called).toEqual(false);
			expect(failStub.called).toEqual(false);

			fakeServer.requests[0].respond(
				200,
				{'Content-Type': 'application/json'},
				jsonData
			);

			expect(doneStub.calledOnce).toEqual(true);
			expect(doneStub.calledWithExactly([{
				'label': 'bob',
				'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'user1'}
			}], [{
				'label': 'bob',
				'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'user1'}
			}])).toEqual(true);
			expect(failStub.called).toEqual(false);

			var done2Stub = sinon.stub();
			var fail2Stub = sinon.stub();

			dialog._getSuggestions('bob', 42, shareModel).done(done2Stub).fail(fail2Stub);

			expect(doneStub.calledOnce).toEqual(true);
			expect(failStub.called).toEqual(false);

			expect(done2Stub.calledOnce).toEqual(true);
			expect(done2Stub.calledWithExactly([{
				'label': 'bob',
				'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'user1'}
			}], [{
				'label': 'bob',
				'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'user1'}
			}])).toEqual(true);
			expect(fail2Stub.called).toEqual(false);
		});

		it('sends a request to the server again for the same parameters if the calls are not consecutive', function() {
			var doneStub = sinon.stub();
			var failStub = sinon.stub();

			dialog._getSuggestions('bob', 42, shareModel).done(doneStub).fail(failStub);

			var jsonData = JSON.stringify({
				'ocs': {
					'meta': {
						'status': 'success',
						'statuscode': 100,
						'message': null
					},
					'data': {
						'exact': {
							'users': [
								{
									'label': 'bob',
									'value': {
										'shareType': OC.Share.SHARE_TYPE_USER,
										'shareWith': 'user1'
									}
								}
							],
							'groups': [],
							'remotes': []
						},
						'users': [],
						'groups': [],
						'remotes': [],
						'lookup': []
					}
				}
			});

			expect(doneStub.called).toEqual(false);
			expect(failStub.called).toEqual(false);

			fakeServer.requests[0].respond(
				200,
				{'Content-Type': 'application/json'},
				jsonData
			);

			expect(doneStub.calledOnce).toEqual(true);
			expect(doneStub.calledWithExactly([{
				'label': 'bob',
				'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'user1'}
			}], [{
				'label': 'bob',
				'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'user1'}
			}])).toEqual(true);
			expect(failStub.called).toEqual(false);

			var done2Stub = sinon.stub();
			var fail2Stub = sinon.stub();

			dialog._getSuggestions('bob', 108, shareModel).done(done2Stub).fail(fail2Stub);

			expect(done2Stub.called).toEqual(false);
			expect(fail2Stub.called).toEqual(false);

			fakeServer.requests[1].respond(
				200,
				{'Content-Type': 'application/json'},
				jsonData
			);

			expect(done2Stub.calledOnce).toEqual(true);
			expect(fail2Stub.called).toEqual(false);

			var done3Stub = sinon.stub();
			var fail3Stub = sinon.stub();

			dialog._getSuggestions('bob', 42, shareModel).done(done3Stub).fail(fail3Stub);

			expect(done3Stub.called).toEqual(false);
			expect(fail3Stub.called).toEqual(false);

			fakeServer.requests[2].respond(
				200,
				{'Content-Type': 'application/json'},
				jsonData
			);

			expect(doneStub.calledOnce).toEqual(true);
			expect(failStub.called).toEqual(false);
			expect(done2Stub.calledOnce).toEqual(true);
			expect(fail2Stub.called).toEqual(false);

			expect(done3Stub.calledOnce).toEqual(true);
			expect(done3Stub.calledWithExactly([{
				'label': 'bob',
				'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'user1'}
			}], [{
				'label': 'bob',
				'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'user1'}
			}])).toEqual(true);
			expect(fail3Stub.called).toEqual(false);
		});
	});
	describe('autocompletion of users', function() {
		var showTemporaryNotificationStub;

		beforeEach(function() {
			showTemporaryNotificationStub = sinon.stub(OC.Notification, 'show');
		});

		afterEach(function() {
			showTemporaryNotificationStub.restore();
		});

		describe('triggers autocomplete display and focus with data when ajax search succeeds', function () {
			it('users', function () {
				dialog.render();
				var response = sinon.stub();
				dialog.autocompleteHandler({term: 'bob'}, response);
				var jsonData = JSON.stringify({
					'ocs': {
						'meta': {
							'status': 'success',
							'statuscode': 100,
							'message': null
						},
						'data': {
							'exact': {
								'users': [
									{
										'label': 'bob',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_USER,
											'shareWith': 'user1'
										}
									}
								],
								'groups': [],
								'remotes': []
							},
							'users': [
								{
									'label': 'bobby',
									'value': {
										'shareType': OC.Share.SHARE_TYPE_USER,
										'shareWith': 'imbob'
									}
								}
							],
							'groups': [],
							'remotes': [],
							'lookup': []
						}
					}
				});
				fakeServer.requests[0].respond(
					200,
					{'Content-Type': 'application/json'},
					jsonData
				);
				expect(response.calledWithExactly([{
					'label': 'bob',
					'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'user1'}
				}, {
					'label': 'bobby',
					'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'imbob'}
				}])).toEqual(true);
				expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
			});

			it('groups', function () {
				dialog.render();
				var response = sinon.stub();
				dialog.autocompleteHandler({term: 'group'}, response);
				var jsonData = JSON.stringify({
					'ocs': {
						'meta': {
							'status': 'success',
							'statuscode': 100,
							'message': null
						},
						'data': {
							'exact': {
								'users': [],
								'groups': [
									{
										'label': 'group',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_GROUP,
											'shareWith': 'group'
										}
									}
								],
								'remotes': []
							},
							'users': [],
							'groups': [
								{
									'label': 'group2',
									'value': {
										'shareType': OC.Share.SHARE_TYPE_GROUP,
										'shareWith': 'group2'
									}
								}
							],
							'remotes': [],
							'lookup': []
						}
					}
				});
				fakeServer.requests[0].respond(
					200,
					{'Content-Type': 'application/json'},
					jsonData
				);
				expect(response.calledWithExactly([{
					'label': 'group',
					'value': {'shareType': OC.Share.SHARE_TYPE_GROUP, 'shareWith': 'group'}
				}, {
					'label': 'group2',
					'value': {'shareType': OC.Share.SHARE_TYPE_GROUP, 'shareWith': 'group2'}
				}])).toEqual(true);
				expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
			});

			it('remotes', function () {
				dialog.render();
				var response = sinon.stub();
				dialog.autocompleteHandler({term: 'foo@bar.com/baz'}, response);
				var jsonData = JSON.stringify({
					'ocs': {
						'meta': {
							'status': 'success',
							'statuscode': 100,
							'message': null
						},
						'data': {
							'exact': {
								'users': [],
								'groups': [],
								'remotes': [
									{
										'label': 'foo@bar.com/baz',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_REMOTE,
											'shareWith': 'foo@bar.com/baz'
										}
									}
								]
							},
							'users': [],
							'groups': [],
							'remotes': [
								{
									'label': 'foo@bar.com/baz2',
									'value': {
										'shareType': OC.Share.SHARE_TYPE_REMOTE,
										'shareWith': 'foo@bar.com/baz2'
									}
								}
							],
							'lookup': []
						}
					}
				});
				fakeServer.requests[0].respond(
					200,
					{'Content-Type': 'application/json'},
					jsonData
				);
				expect(response.calledWithExactly([{
					'label': 'foo@bar.com/baz',
					'value': {'shareType': OC.Share.SHARE_TYPE_REMOTE, 'shareWith': 'foo@bar.com/baz'}
				}, {
					'label': 'foo@bar.com/baz2',
					'value': {'shareType': OC.Share.SHARE_TYPE_REMOTE, 'shareWith': 'foo@bar.com/baz2'}
				}])).toEqual(true);
				expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
			});

			it('emails', function () {
				dialog.render();
				var response = sinon.stub();
				dialog.autocompleteHandler({term: 'foo@bar.com'}, response);
				var jsonData = JSON.stringify({
					'ocs': {
						'meta': {
							'status': 'success',
							'statuscode': 100,
							'message': null
						},
						'data': {
							'exact': {
								'users': [],
								'groups': [],
								'remotes': [],
								'emails': [
									{
										'label': 'foo@bar.com',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_EMAIL,
											'shareWith': 'foo@bar.com'
										}
									}
								]
							},
							'users': [],
							'groups': [],
							'remotes': [],
							'lookup': [],
							'emails': [
								{
									'label': 'foo@bar.com2',
									'value': {
										'shareType': OC.Share.SHARE_TYPE_EMAIL,
										'shareWith': 'foo@bar.com2'
									}
								}
							]
						}
					}
				});
				fakeServer.requests[0].respond(
					200,
					{'Content-Type': 'application/json'},
					jsonData
				);
				expect(response.calledWithExactly([{
					'label': 'foo@bar.com',
					'value': {'shareType': OC.Share.SHARE_TYPE_EMAIL, 'shareWith': 'foo@bar.com'}
				}, {
					'label': 'foo@bar.com2',
					'value': {'shareType': OC.Share.SHARE_TYPE_EMAIL, 'shareWith': 'foo@bar.com2'}
				}])).toEqual(true);
				expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
			});

			it('circles', function () {
				dialog.render();
				var response = sinon.stub();
				dialog.autocompleteHandler({term: 'CircleName'}, response);
				var jsonData = JSON.stringify({
					'ocs': {
						'meta': {
							'status': 'success',
							'statuscode': 100,
							'message': null
						},
						'data': {
							'exact': {
								'users': [],
								'groups': [],
								'remotes': [],
								'circles': [
									{
										'label': 'CircleName (type, owner)',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_CIRCLE,
											'shareWith': 'shortId'
										}
									},
									{
										'label': 'CircleName (type2, owner)',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_CIRCLE,
											'shareWith': 'shortId2'
										}
									}
								]
							},
							'users': [],
							'groups': [],
							'remotes': [],
							'lookup': [],
							'circles': [
								{
									'label': 'CircleName2 (type, owner)',
									'value': {
										'shareType': OC.Share.SHARE_TYPE_CIRCLE,
										'shareWith': 'shortId3'
									}
								}
							]
						}
					}
				});
				fakeServer.requests[0].respond(
					200,
					{'Content-Type': 'application/json'},
					jsonData
				);
				expect(response.calledWithExactly([{
					'label': 'CircleName (type, owner)',
					'value': {'shareType': OC.Share.SHARE_TYPE_CIRCLE, 'shareWith': 'shortId'}
				}, {
					'label': 'CircleName (type2, owner)',
					'value': {'shareType': OC.Share.SHARE_TYPE_CIRCLE, 'shareWith': 'shortId2'}
				}, {
					'label': 'CircleName2 (type, owner)',
					'value': {'shareType': OC.Share.SHARE_TYPE_CIRCLE, 'shareWith': 'shortId3'}
				}])).toEqual(true);
				expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
			});
		});

		describe('filter out', function() {
			it('the current user', function () {
				dialog.render();
				var response = sinon.stub();
				dialog.autocompleteHandler({term: 'bob'}, response);
				var jsonData = JSON.stringify({
					'ocs': {
						'meta': {
							'status': 'success',
							'statuscode': 100,
							'message': null
						},
						'data': {
							'exact': {
								'users': [],
								'groups': [],
								'remotes': []
							},
							'users': [
								{
									'label': 'bob',
									'value': {
										'shareType': 0,
										'shareWith': OC.currentUser
									}
								},
								{
									'label': 'bobby',
									'value': {
										'shareType': 0,
										'shareWith': 'imbob'
									}
								}
							],
							'groups': [],
							'remotes': [],
							'lookup': []
						}
					}
				});
				fakeServer.requests[0].respond(
					200,
					{'Content-Type': 'application/json'},
					jsonData
				);
				expect(response.calledWithExactly([{
					'label': 'bobby',
					'value': {'shareType': 0, 'shareWith': 'imbob'}
				}])).toEqual(true);
				expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
			});

			it('the share owner', function () {
				shareModel.set({
					reshare: {
						uid_owner: 'user1'
					},
					shares: [],
					permissions: OC.PERMISSION_READ
				});

				dialog.render();
				var response = sinon.stub();
				dialog.autocompleteHandler({term: 'bob'}, response);
				var jsonData = JSON.stringify({
					'ocs': {
						'meta': {
							'status': 'success',
							'statuscode': 100,
							'message': null
						},
						'data': {
							'exact': {
								'users': [],
								'groups': [],
								'remotes': []
							},
							'users': [
								{
									'label': 'bob',
									'value': {
										'shareType': 0,
										'shareWith': 'user1'
									}
								},
								{
									'label': 'bobby',
									'value': {
										'shareType': 0,
										'shareWith': 'imbob'
									}
								}
							],
							'groups': [],
							'remotes': [],
							'lookup': []
						}
					}
				});
				fakeServer.requests[0].respond(
					200,
					{'Content-Type': 'application/json'},
					jsonData
				);
				expect(response.calledWithExactly([{
					'label': 'bobby',
					'value': {'shareType': 0, 'shareWith': 'imbob'}
				}])).toEqual(true);
				expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
			});

			describe('already shared with', function () {
				beforeEach(function() {
					shareModel.set({
						reshare: {},
						shares: [{
							id: 100,
							item_source: 123,
							permissions: 31,
							share_type: OC.Share.SHARE_TYPE_USER,
							share_with: 'user1',
							share_with_displayname: 'User One'
						},{
							id: 101,
							item_source: 123,
							permissions: 31,
							share_type: OC.Share.SHARE_TYPE_GROUP,
							share_with: 'group',
							share_with_displayname: 'group'
						},{
							id: 102,
							item_source: 123,
							permissions: 31,
							share_type: OC.Share.SHARE_TYPE_REMOTE,
							share_with: 'foo@bar.com/baz',
							share_with_displayname: 'foo@bar.com/baz'
						},{
							id: 103,
							item_source: 123,
							permissions: 31,
							share_type: OC.Share.SHARE_TYPE_EMAIL,
							share_with: 'foo@bar.com',
							share_with_displayname: 'foo@bar.com'
						},{
							id: 104,
							item_source: 123,
							permissions: 31,
							share_type: OC.Share.SHARE_TYPE_CIRCLE,
							share_with: 'shortId',
							share_with_displayname: 'CircleName (type, owner)'
						}]
					});
				});

				it('users', function () {
					dialog.render();
					var response = sinon.stub();
					dialog.autocompleteHandler({term: 'bo'}, response);
					var jsonData = JSON.stringify({
						'ocs': {
							'meta': {
								'status': 'success',
								'statuscode': 100,
								'message': null
							},
							'data': {
								'exact': {
									'users': [],
									'groups': [],
									'remotes': []
								},
								'users': [
									{
										'label': 'bob',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_USER,
											'shareWith': 'user1'
										}
									},
									{
										'label': 'bobby',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_USER,
											'shareWith': 'imbob'
										}
									}
								],
								'groups': [],
								'remotes': [],
								'lookup': []
							}
						}
					});
					fakeServer.requests[0].respond(
						200,
						{'Content-Type': 'application/json'},
						jsonData
					);
					expect(response.calledWithExactly([{
						'label': 'bobby',
						'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'imbob'}
					}])).toEqual(true);
					expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
				});

				it('users with an e-mail address', function () {
					dialog.render();
					var response = sinon.stub();
					dialog.autocompleteHandler({term: 'bob'}, response);
					var jsonData = JSON.stringify({
						'ocs': {
							'meta': {
								'status': 'success',
								'statuscode': 100,
								'message': null
							},
							'data': {
								'exact': {
									'users': [],
									'groups': [],
									'remotes': []
								},
								'users': [
									{
										'label': 'bob',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_USER,
											'shareWith': 'user1',
											'hasEmailAddress': true
										},
									},
									{
										'label': 'bobby',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_USER,
											'shareWith': 'imbob'
										}
									}
								],
								'groups': [],
								'remotes': [],
								'lookup': []
							}
						}
					});
					fakeServer.requests[0].respond(
						200,
						{'Content-Type': 'application/json'},
						jsonData
					);
					expect(response.calledWithExactly([{
						'label': 'bob',
						'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'user1', 'hasEmailAddress': true},
						'resendMailNotification': 100
					}, {
						'label': 'bobby',
						'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'imbob'}
					}])).toEqual(true);
					expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
				});

				it('users (exact)', function () {
					dialog.render();
					var response = sinon.stub();
					dialog.autocompleteHandler({term: 'bob'}, response);
					var jsonData = JSON.stringify({
						'ocs': {
							'meta': {
								'status': 'success',
								'statuscode': 100,
								'message': null
							},
							'data': {
								'exact': {
									'users': [
										{
											'label': 'bob',
											'value': {
												'shareType': OC.Share.SHARE_TYPE_USER,
												'shareWith': 'user1'
											}
										}
									],
									'groups': [],
									'remotes': []
								},
								'users': [
									{
										'label': 'bobby',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_USER,
											'shareWith': 'imbob'
										}
									}
								],
								'groups': [],
								'remotes': [],
								'lookup': []
							}
						}
					});
					fakeServer.requests[0].respond(
						200,
						{'Content-Type': 'application/json'},
						jsonData
					);
					expect(response.calledWithExactly([{
						'label': 'bobby',
						'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'imbob'}
					}])).toEqual(true);
					expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
				});

				it('users with an e-mail address (exact)', function () {
					dialog.render();
					var response = sinon.stub();
					dialog.autocompleteHandler({term: 'bob'}, response);
					var jsonData = JSON.stringify({
						'ocs': {
							'meta': {
								'status': 'success',
								'statuscode': 100,
								'message': null
							},
							'data': {
								'exact': {
									'users': [
										{
											'label': 'bob',
											'value': {
												'shareType': OC.Share.SHARE_TYPE_USER,
												'shareWith': 'user1',
												'hasEmailAddress': true
											}
										}
									],
									'groups': [],
									'remotes': []
								},
								'users': [
									{
										'label': 'bobby',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_USER,
											'shareWith': 'imbob'
										}
									}
								],
								'groups': [],
								'remotes': [],
								'lookup': []
							}
						}
					});
					fakeServer.requests[0].respond(
						200,
						{'Content-Type': 'application/json'},
						jsonData
					);
					expect(response.calledWithExactly([{
						'label': 'bob',
						'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'user1', 'hasEmailAddress': true},
						'resendMailNotification': 100
					}, {
						'label': 'bobby',
						'value': {'shareType': OC.Share.SHARE_TYPE_USER, 'shareWith': 'imbob'}
					}])).toEqual(true);
					expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
				});

				it('groups', function () {
					dialog.render();
					var response = sinon.stub();
					dialog.autocompleteHandler({term: 'grou'}, response);
					var jsonData = JSON.stringify({
						'ocs': {
							'meta': {
								'status': 'success',
								'statuscode': 100,
								'message': null
							},
							'data': {
								'exact': {
									'users': [],
									'groups': [],
									'remotes': []
								},
								'users': [],
								'groups': [
									{
										'label': 'group',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_GROUP,
											'shareWith': 'group'
										}
									},
									{
										'label': 'group2',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_GROUP,
											'shareWith': 'group2'
										}
									}
								],
								'remotes': [],
								'lookup': []
							}
						}
					});
					fakeServer.requests[0].respond(
						200,
						{'Content-Type': 'application/json'},
						jsonData
					);
					expect(response.calledWithExactly([{
						'label': 'group2',
						'value': {'shareType': OC.Share.SHARE_TYPE_GROUP, 'shareWith': 'group2'}
					}])).toEqual(true);
					expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
				});

				it('groups (exact)', function () {
					dialog.render();
					var response = sinon.stub();
					dialog.autocompleteHandler({term: 'group'}, response);
					var jsonData = JSON.stringify({
						'ocs': {
							'meta': {
								'status': 'success',
								'statuscode': 100,
								'message': null
							},
							'data': {
								'exact': {
									'users': [],
									'groups': [
										{
											'label': 'group',
											'value': {
												'shareType': OC.Share.SHARE_TYPE_GROUP,
												'shareWith': 'group'
											}
										}
									],
									'remotes': []
								},
								'users': [],
								'groups': [
									{
										'label': 'group2',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_GROUP,
											'shareWith': 'group2'
										}
									}
								],
								'remotes': [],
								'lookup': []
							}
						}
					});
					fakeServer.requests[0].respond(
						200,
						{'Content-Type': 'application/json'},
						jsonData
					);
					expect(response.calledWithExactly([{
						'label': 'group2',
						'value': {'shareType': OC.Share.SHARE_TYPE_GROUP, 'shareWith': 'group2'}
					}])).toEqual(true);
					expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
				});

				it('remotes', function () {
					dialog.render();
					var response = sinon.stub();
					dialog.autocompleteHandler({term: 'foo'}, response);
					var jsonData = JSON.stringify({
						'ocs': {
							'meta': {
								'status': 'success',
								'statuscode': 100,
								'message': null
							},
							'data': {
								'exact': {
									'users': [],
									'groups': [],
									'remotes': []
								},
								'users': [],
								'groups': [],
								'remotes': [
									{
										'label': 'foo@bar.com/baz',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_REMOTE,
											'shareWith': 'foo@bar.com/baz'
										}
									},
									{
										'label': 'foo2@bar.com/baz',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_REMOTE,
											'shareWith': 'foo2@bar.com/baz'
										}
									}
								],
								'lookup': []
							}
						}
					});
					fakeServer.requests[0].respond(
						200,
						{'Content-Type': 'application/json'},
						jsonData
					);
					expect(response.calledWithExactly([{
						'label': 'foo2@bar.com/baz',
						'value': {'shareType': OC.Share.SHARE_TYPE_REMOTE, 'shareWith': 'foo2@bar.com/baz'}
					}])).toEqual(true);
					expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
				});

				it('remotes (exact)', function () {
					dialog.render();
					var response = sinon.stub();
					dialog.autocompleteHandler({term: 'foo@bar.com/baz'}, response);
					var jsonData = JSON.stringify({
						'ocs': {
							'meta': {
								'status': 'success',
								'statuscode': 100,
								'message': null
							},
							'data': {
								'exact': {
									'users': [],
									'groups': [],
									'remotes': [
										{
											'label': 'foo@bar.com/baz',
											'value': {
												'shareType': OC.Share.SHARE_TYPE_REMOTE,
												'shareWith': 'foo@bar.com/baz'
											}
										}
									]
								},
								'users': [],
								'groups': [],
								'remotes': [
									{
										'label': 'foo@bar.com/baz2',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_REMOTE,
											'shareWith': 'foo@bar.com/baz2'
										}
									}
								],
								'lookup': []
							}
						}
					});
					fakeServer.requests[0].respond(
						200,
						{'Content-Type': 'application/json'},
						jsonData
					);
					expect(response.calledWithExactly([{
						'label': 'foo@bar.com/baz2',
						'value': {'shareType': OC.Share.SHARE_TYPE_REMOTE, 'shareWith': 'foo@bar.com/baz2'}
					}])).toEqual(true);
					expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
				});

				it('emails', function () {
					dialog.render();
					var response = sinon.stub();
					dialog.autocompleteHandler({term: 'foo'}, response);
					var jsonData = JSON.stringify({
						'ocs': {
							'meta': {
								'status': 'success',
								'statuscode': 100,
								'message': null
							},
							'data': {
								'exact': {
									'users': [],
									'groups': [],
									'remotes': [],
									'emails': []
								},
								'users': [],
								'groups': [],
								'remotes': [],
								'lookup': [],
								'emails': [
									{
										'label': 'foo@bar.com',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_EMAIL,
											'shareWith': 'foo@bar.com'
										}
									},
									{
										'label': 'foo2@bar.com',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_EMAIL,
											'shareWith': 'foo2@bar.com'
										}
									}
								]
							}
						}
					});
					fakeServer.requests[0].respond(
						200,
						{'Content-Type': 'application/json'},
						jsonData
					);
					expect(response.calledWithExactly([{
						'label': 'foo@bar.com',
						'value': {'shareType': OC.Share.SHARE_TYPE_EMAIL, 'shareWith': 'foo@bar.com'},
						'resendMailNotification': 103
					}, {
						'label': 'foo2@bar.com',
						'value': {'shareType': OC.Share.SHARE_TYPE_EMAIL, 'shareWith': 'foo2@bar.com'}
					}])).toEqual(true);
					expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
				});

				it('emails (exact)', function () {
					dialog.render();
					var response = sinon.stub();
					dialog.autocompleteHandler({term: 'foo@bar.com'}, response);
					var jsonData = JSON.stringify({
						'ocs': {
							'meta': {
								'status': 'success',
								'statuscode': 100,
								'message': null
							},
							'data': {
								'exact': {
									'users': [],
									'groups': [],
									'remotes': [],
									'emails': [
										{
											'label': 'foo@bar.com',
											'value': {
												'shareType': OC.Share.SHARE_TYPE_EMAIL,
												'shareWith': 'foo@bar.com'
											}
										}
									]
								},
								'users': [],
								'groups': [],
								'remotes': [],
								'lookup': [],
								'emails': [
									{
										'label': 'foo@bar.com2',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_EMAIL,
											'shareWith': 'foo@bar.com2'
										}
									}
								]
							}
						}
					});
					fakeServer.requests[0].respond(
						200,
						{'Content-Type': 'application/json'},
						jsonData
					);
					expect(response.calledWithExactly([{
						'label': 'foo@bar.com',
						'value': {'shareType': OC.Share.SHARE_TYPE_EMAIL, 'shareWith': 'foo@bar.com'},
						'resendMailNotification': 103
					}, {
						'label': 'foo@bar.com2',
						'value': {'shareType': OC.Share.SHARE_TYPE_EMAIL, 'shareWith': 'foo@bar.com2'}
					}])).toEqual(true);
					expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
				});

				it('circles', function () {
					dialog.render();
					var response = sinon.stub();
					dialog.autocompleteHandler({term: 'CircleNam'}, response);
					var jsonData = JSON.stringify({
						'ocs': {
							'meta': {
								'status': 'success',
								'statuscode': 100,
								'message': null
							},
							'data': {
								'exact': {
									'users': [],
									'groups': [],
									'remotes': [],
									'circles': []
								},
								'users': [],
								'groups': [],
								'remotes': [],
								'lookup': [],
								'circles': [
									{
										'label': 'CircleName (type, owner)',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_CIRCLE,
											'shareWith': 'shortId'
										}
									},
									{
										'label': 'CircleName (type2, owner)',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_CIRCLE,
											'shareWith': 'shortId2'
										}
									}
								]
							}
						}
					});
					fakeServer.requests[0].respond(
						200,
						{'Content-Type': 'application/json'},
						jsonData
					);
					expect(response.calledWithExactly([{
						'label': 'CircleName (type2, owner)',
						'value': {'shareType': OC.Share.SHARE_TYPE_CIRCLE, 'shareWith': 'shortId2'}
					}])).toEqual(true);
					expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
				});

				it('circles (exact)', function () {
					dialog.render();
					var response = sinon.stub();
					dialog.autocompleteHandler({term: 'CircleName'}, response);
					var jsonData = JSON.stringify({
						'ocs': {
							'meta': {
								'status': 'success',
								'statuscode': 100,
								'message': null
							},
							'data': {
								'exact': {
									'users': [],
									'groups': [],
									'remotes': [],
									'circles': [
										{
											'label': 'CircleName (type, owner)',
											'value': {
												'shareType': OC.Share.SHARE_TYPE_CIRCLE,
												'shareWith': 'shortId'
											}
										},
										{
											'label': 'CircleName (type2, owner)',
											'value': {
												'shareType': OC.Share.SHARE_TYPE_CIRCLE,
												'shareWith': 'shortId2'
											}
										}
									]
								},
								'users': [],
								'groups': [],
								'remotes': [],
								'lookup': [],
								'circles': [
									{
										'label': 'CircleName2 (type, owner)',
										'value': {
											'shareType': OC.Share.SHARE_TYPE_CIRCLE,
											'shareWith': 'shortId3'
										}
									}
								]
							}
						}
					});
					fakeServer.requests[0].respond(
						200,
						{'Content-Type': 'application/json'},
						jsonData
					);
					expect(response.calledWithExactly([{
						'label': 'CircleName (type2, owner)',
						'value': {'shareType': OC.Share.SHARE_TYPE_CIRCLE, 'shareWith': 'shortId2'}
					}, {
						'label': 'CircleName2 (type, owner)',
						'value': {'shareType': OC.Share.SHARE_TYPE_CIRCLE, 'shareWith': 'shortId3'}
					}])).toEqual(true);
					expect(autocompleteStub.calledWith("option", "autoFocus", true)).toEqual(true);
				});
			});
		});

		it('throws a notification for a successful ajax call with failure content', function () {
			dialog.render();
			var response = sinon.stub();
			dialog.autocompleteHandler({term: 'bob'}, response);
			var jsonData = JSON.stringify({
				'ocs' : {
					'meta' : {
						'status': 'failure',
						'statuscode': 400,
						'message': 'error message'
					}
				}
			});
			fakeServer.requests[0].respond(
					200,
					{'Content-Type': 'application/json'},
					jsonData
			);
			expect(response.called).toEqual(false);
			expect(showTemporaryNotificationStub.calledOnce).toEqual(true);
			expect(showTemporaryNotificationStub.firstCall.args[0]).toContain('error message');
		});

		it('throws a notification when the ajax search lookup fails', function () {
			dialog.render();
			dialog.autocompleteHandler({term: 'bob'}, sinon.stub());
			fakeServer.requests[0].respond(500);
			expect(showTemporaryNotificationStub.calledOnce).toEqual(true);
		});

		describe('renders the autocomplete elements', function() {
			it('renders a user element to resend its mail notification', function() {
				dialog.render();
				var el = dialog.autocompleteRenderItem(
						$("<ul></ul>"),
						{label: "1", value: { shareType: OC.Share.SHARE_TYPE_USER }, resendMailNotification: 'user1@server.com'}
				);
				expect(el.is('li')).toEqual(true);
				expect(el.hasClass('user')).toEqual(true);
				expect(el.has('span .icon-mail')).toBeTruthy();
			});

			it('renders a group element', function() {
				dialog.render();
				var el = dialog.autocompleteRenderItem(
						$("<ul></ul>"),
						{label: "1", value: { shareType: OC.Share.SHARE_TYPE_GROUP }}
				);
				expect(el.is('li')).toEqual(true);
				expect(el.hasClass('group')).toEqual(true);
			});

			it('renders a remote element', function() {
				dialog.render();
				var el = dialog.autocompleteRenderItem(
						$("<ul></ul>"),
						{label: "1", value: { shareType: OC.Share.SHARE_TYPE_REMOTE }}
				);
				expect(el.is('li')).toEqual(true);
				expect(el.hasClass('user')).toEqual(true);
			});
		});

		it('calls addShare after selection', function() {
			dialog.render();

			var shareWith = $('.shareWithField')[0];
			var $shareWith = $(shareWith);
			var addShareStub = sinon.stub(shareModel, 'addShare');
			var autocompleteOptions = autocompleteStub.getCall(0).args[0];
			autocompleteOptions.select(new $.Event('select', {target: shareWith}), {
				item: {
					label: 'User Two',
					value: {
						shareType: OC.Share.SHARE_TYPE_USER,
						shareWith: 'user2'
					}
				}
			});

			expect(addShareStub.calledOnce).toEqual(true);
			expect(addShareStub.firstCall.args[0]).toEqual({
				shareType: OC.Share.SHARE_TYPE_USER,
				shareWith: 'user2'
			});

			//Input is locked
			expect($shareWith.val()).toEqual('User Two');
			expect($shareWith.attr('disabled')).toEqual('disabled');

			//Callback is called
			addShareStub.firstCall.args[1].success();

			//Input is unlocked
			expect($shareWith.val()).toEqual('');
			expect($shareWith.attr('disabled')).toEqual(undefined);

			addShareStub.restore();
		});

		it('calls addShare after selection and fail to share', function() {
			dialog.render();

			var shareWith = $('.shareWithField')[0];
			var $shareWith = $(shareWith);
			var addShareStub = sinon.stub(shareModel, 'addShare');
			var autocompleteOptions = autocompleteStub.getCall(0).args[0];
			autocompleteOptions.select(new $.Event('select', {target: shareWith}), {
				item: {
					label: 'User Two',
					value: {
						shareType: OC.Share.SHARE_TYPE_USER,
						shareWith: 'user2'
					}
				}
			});

			expect(addShareStub.calledOnce).toEqual(true);
			expect(addShareStub.firstCall.args[0]).toEqual({
				shareType: OC.Share.SHARE_TYPE_USER,
				shareWith: 'user2'
			});

			//Input is locked
			expect($shareWith.val()).toEqual('User Two');
			expect($shareWith.attr('disabled')).toEqual('disabled');

			//Callback is called
			addShareStub.firstCall.args[1].error();

			//Input is unlocked
			expect($shareWith.val()).toEqual('User Two');
			expect($shareWith.attr('disabled')).toEqual(undefined);

			addShareStub.restore();
		});

		it('calls resendMailNotification after selection', function() {
			dialog.render();

			var shareWith = $('.shareWithField')[0];
			var $shareWith = $(shareWith);
			var resendMailNotificationStub = sinon.stub(shareModel, 'resendMailNotification');
			var autocompleteOptions = autocompleteStub.getCall(0).args[0];
			autocompleteOptions.select(new $.Event('select', {target: shareWith}), {
				item: {
					label: 'User One',
					value: {
						shareType: OC.Share.SHARE_TYPE_USER,
						shareWith: 'user1',
						hasEmailAddress: true
					},
					resendMailNotification: 100
				}
			});

			expect(resendMailNotificationStub.calledOnce).toEqual(true);
			expect(resendMailNotificationStub.firstCall.args[0]).toEqual(100);

			//Input is locked
			expect($shareWith.val()).toEqual('User One');
			expect($shareWith.attr('disabled')).toEqual('disabled');

			//Callback is called
			resendMailNotificationStub.firstCall.args[1].success();

			//Input is unlocked
			expect($shareWith.val()).toEqual('');
			expect($shareWith.attr('disabled')).toEqual(undefined);

			resendMailNotificationStub.restore();
		});

		it('calls resendMailNotification after selection and fail to resend mail', function() {
			dialog.render();

			var shareWith = $('.shareWithField')[0];
			var $shareWith = $(shareWith);
			var resendMailNotificationStub = sinon.stub(shareModel, 'resendMailNotification');
			var autocompleteOptions = autocompleteStub.getCall(0).args[0];
			autocompleteOptions.select(new $.Event('select', {target: shareWith}), {
				item: {
					label: 'User One',
					value: {
						shareType: OC.Share.SHARE_TYPE_USER,
						shareWith: 'user1',
						hasEmailAddress: true
					},
					resendMailNotification: 100
				}
			});

			expect(resendMailNotificationStub.calledOnce).toEqual(true);
			expect(resendMailNotificationStub.firstCall.args[0]).toEqual(100);

			//Input is locked
			expect($shareWith.val()).toEqual('User One');
			expect($shareWith.attr('disabled')).toEqual('disabled');

			//Callback is called
			resendMailNotificationStub.firstCall.args[1].error();

			//Input is unlocked
			expect($shareWith.val()).toEqual('User One');
			expect($shareWith.attr('disabled')).toEqual(undefined);

			resendMailNotificationStub.restore();
		});

		it('hides the loading icon when all the pending operations finish', function() {
			dialog.render();

			expect(dialog.$el.find('.shareWithLoading').hasClass('hidden')).toEqual(true);
			expect(dialog.$el.find('.shareWithConfirm').hasClass('hidden')).toEqual(false);

			var response = sinon.stub();
			dialog.autocompleteHandler({term: 'bob'}, response);
			dialog.autocompleteHandler({term: 'bobby'}, response);

			var jsonData = JSON.stringify({
				'ocs': {
					'meta': {
						'status': 'success',
						'statuscode': 100,
						'message': null
					},
					'data': {
						'exact': {
							'users': [],
							'groups': [],
							'remotes': []
						},
						'users': [],
						'groups': [],
						'remotes': [],
						'lookup': []
					}
				}
			});

			fakeServer.requests[0].respond(
				200,
				{'Content-Type': 'application/json'},
				jsonData
			);

			expect(dialog.$el.find('.shareWithLoading').hasClass('hidden')).toEqual(false);
			expect(dialog.$el.find('.shareWithConfirm').hasClass('hidden')).toEqual(true);

			fakeServer.requests[1].respond(
				200,
				{'Content-Type': 'application/json'},
				jsonData
			);

			expect(dialog.$el.find('.shareWithLoading').hasClass('hidden')).toEqual(true);
			expect(dialog.$el.find('.shareWithConfirm').hasClass('hidden')).toEqual(false);
		});
	});
	describe('confirm share', function() {
		var addShareStub;
		var resendMailNotificationStub;
		var tooltipStub;
		var showTemporaryNotificationStub;

		beforeEach(function() {
			addShareStub = sinon.stub(shareModel, 'addShare');
			resendMailNotificationStub = sinon.stub(shareModel, 'resendMailNotification');

			tooltipStub = sinon.stub($.fn, 'tooltip').callsFake(function() {
				return $('<div></div>');
			});

			showTemporaryNotificationStub = sinon.stub(OC.Notification, 'showTemporary');

			dialog.render();
		});

		afterEach(function() {
			addShareStub.restore();
			resendMailNotificationStub.restore();
			tooltipStub.restore();
			showTemporaryNotificationStub.restore();
		});

		it('sets the appropriate UI state while waiting to get the suggestions', function() {
			expect(dialog.$el.find('.shareWithLoading').hasClass('hidden')).toEqual(true);
			expect(dialog.$el.find('.shareWithConfirm').hasClass('hidden')).toEqual(false);
			expect(autocompleteStub.callCount).toEqual(1);
			expect(typeof autocompleteStub.firstCall.args[0]).toEqual('object');
			expect(dialog.$el.find('.shareWithField').prop('disabled')).toEqual(false);

			dialog.$el.find('.shareWithField').val('bob');

			dialog._confirmShare();

			expect(dialog.$el.find('.shareWithLoading').hasClass('hidden')).toEqual(false);
			expect(dialog.$el.find('.shareWithConfirm').hasClass('hidden')).toEqual(true);
			expect(autocompleteStub.lastCall.args[0]).toEqual('disable');
			expect(autocompleteStub.calledWith('close')).toEqual(true);
			expect(dialog.$el.find('.shareWithField').prop('disabled')).toEqual(true);
			expect(dialog.$el.find('.shareWithField').val()).toEqual('bob');
		});

		it('calls addShare with the only suggestion', function() {
			dialog.$el.find('.shareWithField').val('bob');

			dialog._confirmShare();

			var jsonData = JSON.stringify({
				'ocs': {
					'meta': {
						'status': 'success',
						'statuscode': 100,
						'message': null
					},
					'data': {
						'exact': {
							'users': [
								{
									'label': 'bob',
									'value': {
										'shareType': OC.Share.SHARE_TYPE_USER,
										'shareWith': 'user1'
									}
								}
							],
							'groups': [],
							'remotes': []
						},
						'users': [],
						'groups': [],
						'remotes': [],
						'lookup': []
					}
				}
			});
			fakeServer.requests[0].respond(
				200,
				{'Content-Type': 'application/json'},
				jsonData
			);

			// Ensure that the UI is not restored before adding the share
			expect(dialog.$el.find('.shareWithLoading').hasClass('hidden')).toEqual(false);
			expect(dialog.$el.find('.shareWithConfirm').hasClass('hidden')).toEqual(true);
			expect(autocompleteStub.lastCall.args[0]).toEqual('disable');
			expect(dialog.$el.find('.shareWithField').prop('disabled')).toEqual(true);
			expect(dialog.$el.find('.shareWithField').val()).toEqual('bob');

			expect(addShareStub.calledOnce).toEqual(true);
			expect(addShareStub.firstCall.args[0]).toEqual({
				shareType: OC.Share.SHARE_TYPE_USER,
				shareWith: 'user1'
			});
			expect(resendMailNotificationStub.called).toEqual(false);

			// "yield" and "callArg" from SinonJS can not be used, as the
			// callback is a property not in the first argument.
			addShareStub.firstCall.args[1]['success'].apply(shareModel);

			expect(dialog.$el.find('.shareWithLoading').hasClass('hidden')).toEqual(true);
			expect(dialog.$el.find('.shareWithConfirm').hasClass('hidden')).toEqual(false);
			expect(autocompleteStub.lastCall.args[0]).toEqual('enable');
			expect(dialog.$el.find('.shareWithField').prop('disabled')).toEqual(false);
			expect(dialog.$el.find('.shareWithField').val()).toEqual('');
		});

		it('calls resendMailNotification with the only suggestion', function() {
			expect(showTemporaryNotificationStub.calledOnce).toEqual(false);

			shareModel.set({
				shares: [{
					id: 108,
					item_source: 123,
					permissions: 31,
					share_type: OC.Share.SHARE_TYPE_USER,
					share_with: 'user1',
					share_with_displayname: 'User One'
				}]
			});

			dialog.$el.find('.shareWithField').val('bob');

			dialog._confirmShare();

			var jsonData = JSON.stringify({
				'ocs': {
					'meta': {
						'status': 'success',
						'statuscode': 100,
						'message': null
					},
					'data': {
						'exact': {
							'users': [
								{
									'label': 'bob',
									'value': {
										'shareType': OC.Share.SHARE_TYPE_USER,
										'shareWith': 'user1',
										'hasEmailAddress': true
									}
								}
							],
							'groups': [],
							'remotes': []
						},
						'users': [],
						'groups': [],
						'remotes': [],
						'lookup': []
					}
				}
			});
			fakeServer.requests[0].respond(
				200,
				{'Content-Type': 'application/json'},
				jsonData
			);

			// Ensure that the UI is not restored before resending the mail
			expect(dialog.$el.find('.shareWithLoading').hasClass('hidden')).toEqual(false);
			expect(dialog.$el.find('.shareWithConfirm').hasClass('hidden')).toEqual(true);
			expect(dialog.$el.find('.shareWithField').prop('disabled')).toEqual(true);
			expect(dialog.$el.find('.shareWithField').val()).toEqual('bob');

			expect(resendMailNotificationStub.calledOnce).toEqual(true);
			expect(resendMailNotificationStub.firstCall.args[0]).toEqual(108);
			expect(addShareStub.called).toEqual(false);

			// "yield" and "callArg" from SinonJS can not be used, as the
			// callback is a property not in the first argument.
			resendMailNotificationStub.firstCall.args[1]['success'].apply(shareModel);

			expect(dialog.$el.find('.shareWithLoading').hasClass('hidden')).toEqual(true);
			expect(dialog.$el.find('.shareWithConfirm').hasClass('hidden')).toEqual(false);
			expect(dialog.$el.find('.shareWithField').prop('disabled')).toEqual(false);
			expect(dialog.$el.find('.shareWithField').val()).toEqual('');

			expect(showTemporaryNotificationStub.calledOnce).toEqual(true);
		});

		it('handles a failure to share', function() {
			expect(showTemporaryNotificationStub.called).toEqual(false);

			dialog.$el.find('.shareWithField').val('bob');

			dialog._confirmShare();

			var jsonData = JSON.stringify({
				'ocs': {
					'meta': {
						'status': 'success',
						'statuscode': 100,
						'message': null
					},
					'data': {
						'exact': {
							'users': [
								{
									'label': 'bob',
									'value': {
										'shareType': OC.Share.SHARE_TYPE_USER,
										'shareWith': 'user1'
									}
								}
							],
							'groups': [],
							'remotes': []
						},
						'users': [],
						'groups': [],
						'remotes': [],
						'lookup': []
					}
				}
			});
			fakeServer.requests[0].respond(
				200,
				{'Content-Type': 'application/json'},
				jsonData
			);

			// Ensure that the UI is not restored before adding the share
			expect(dialog.$el.find('.shareWithLoading').hasClass('hidden')).toEqual(false);
			expect(dialog.$el.find('.shareWithConfirm').hasClass('hidden')).toEqual(true);
			expect(autocompleteStub.lastCall.args[0]).toEqual('disable');
			expect(dialog.$el.find('.shareWithField').prop('disabled')).toEqual(true);
			expect(dialog.$el.find('.shareWithField').val()).toEqual('bob');

			expect(addShareStub.calledOnce).toEqual(true);
			expect(addShareStub.firstCall.args[0]).toEqual({
				shareType: OC.Share.SHARE_TYPE_USER,
				shareWith: 'user1'
			});
			expect(resendMailNotificationStub.called).toEqual(false);

			// "yield" and "callArg" from SinonJS can not be used, as the
			// callback is a property not in the first argument.
			addShareStub.firstCall.args[1]['error'].apply(shareModel);

			expect(dialog.$el.find('.shareWithLoading').hasClass('hidden')).toEqual(true);
			expect(dialog.$el.find('.shareWithConfirm').hasClass('hidden')).toEqual(false);
			expect(autocompleteStub.lastCall.args[0]).toEqual('enable');
			expect(dialog.$el.find('.shareWithField').prop('disabled')).toEqual(false);
			expect(dialog.$el.find('.shareWithField').val()).toEqual('bob');

			expect(showTemporaryNotificationStub.calledOnce).toEqual(true);
		});

		it('restores UI if there are no matches at all', function() {
			dialog.$el.find('.shareWithField').val('bob');

			dialog._confirmShare();

			var jsonData = JSON.stringify({
				'ocs': {
					'meta': {
						'status': 'success',
						'statuscode': 100,
						'message': null
					},
					'data': {
						'exact': {
							'users': [],
							'groups': [],
							'remotes': []
						},
						'users': [],
						'groups': [],
						'remotes': [],
						'lookup': []
					}
				}
			});
			fakeServer.requests[0].respond(
				200,
				{'Content-Type': 'application/json'},
				jsonData
			);

			expect(addShareStub.called).toEqual(false);
			expect(resendMailNotificationStub.called).toEqual(false);

			expect(dialog.$el.find('.shareWithLoading').hasClass('hidden')).toEqual(true);
			expect(dialog.$el.find('.shareWithConfirm').hasClass('hidden')).toEqual(false);
			expect(autocompleteStub.lastCall.args[0]).toEqual('enable');
			expect(dialog.$el.find('.shareWithField').prop('disabled')).toEqual(false);
			expect(dialog.$el.find('.shareWithField').val()).toEqual('bob');

			// No explicit tooltip is shown; it is automatically shown when the
			// autocomplete is activated again and it finds no matches.
			expect(tooltipStub.lastCall.args[0]).not.toEqual('show');
		});

		it('shows tooltip if there are matches but no exact matches', function() {
			dialog.$el.find('.shareWithField').val('bo');

			dialog._confirmShare();

			var jsonData = JSON.stringify({
				'ocs': {
					'meta': {
						'status': 'success',
						'statuscode': 100,
						'message': null
					},
					'data': {
						'exact': {
							'users': [],
							'groups': [],
							'remotes': []
						},
						'users': [
							{
								'label': 'bob',
								'value': {
									'shareType': OC.Share.SHARE_TYPE_USER,
									'shareWith': 'user1'
								}
							}
						],
						'groups': [],
						'remotes': [],
						'lookup': []
					}
				}
			});
			fakeServer.requests[0].respond(
				200,
				{'Content-Type': 'application/json'},
				jsonData
			);

			expect(addShareStub.called).toEqual(false);
			expect(resendMailNotificationStub.called).toEqual(false);

			expect(dialog.$el.find('.shareWithLoading').hasClass('hidden')).toEqual(true);
			expect(dialog.$el.find('.shareWithConfirm').hasClass('hidden')).toEqual(false);
			expect(autocompleteStub.lastCall.args[0]).toEqual('enable');
			expect(dialog.$el.find('.shareWithField').prop('disabled')).toEqual(false);
			expect(dialog.$el.find('.shareWithField').val()).toEqual('bo');
		});

		it('shows tooltip if there is more than one exact match', function() {
			dialog.$el.find('.shareWithField').val('bob');

			dialog._confirmShare();

			var jsonData = JSON.stringify({
				'ocs': {
					'meta': {
						'status': 'success',
						'statuscode': 100,
						'message': null
					},
					'data': {
						'exact': {
							'users': [
								{
									'label': 'bob',
									'value': {
										'shareType': OC.Share.SHARE_TYPE_USER,
										'shareWith': 'user1'
									}
								}
							],
							'groups': [
								{
									'label': 'bob',
									'value': {
										'shareType': OC.Share.SHARE_TYPE_GROUP,
										'shareWith': 'group1'
									}
								}
							],
							'remotes': []
						},
						'users': [],
						'groups': [],
						'remotes': [],
						'lookup': []
					}
				}
			});
			fakeServer.requests[0].respond(
				200,
				{'Content-Type': 'application/json'},
				jsonData
			);

			expect(addShareStub.called).toEqual(false);
			expect(resendMailNotificationStub.called).toEqual(false);

			expect(dialog.$el.find('.shareWithLoading').hasClass('hidden')).toEqual(true);
			expect(dialog.$el.find('.shareWithConfirm').hasClass('hidden')).toEqual(false);
			expect(autocompleteStub.lastCall.args[0]).toEqual('enable');
			expect(dialog.$el.find('.shareWithField').prop('disabled')).toEqual(false);
			expect(dialog.$el.find('.shareWithField').val()).toEqual('bob');
		});

		it('throws a notification for a successful ajax call with failure content', function () {
			dialog.$el.find('.shareWithField').val('bob');

			dialog._confirmShare();

			var jsonData = JSON.stringify({
				'ocs' : {
					'meta' : {
						'status': 'failure',
						'statuscode': 400,
						'message': 'error message'
					}
				}
			});
			fakeServer.requests[0].respond(
					200,
					{'Content-Type': 'application/json'},
					jsonData
			);

			expect(addShareStub.called).toEqual(false);
			expect(resendMailNotificationStub.called).toEqual(false);

			expect(dialog.$el.find('.shareWithLoading').hasClass('hidden')).toEqual(true);
			expect(dialog.$el.find('.shareWithConfirm').hasClass('hidden')).toEqual(false);
			expect(autocompleteStub.lastCall.args[0]).toEqual('enable');
			expect(dialog.$el.find('.shareWithField').prop('disabled')).toEqual(false);
			expect(dialog.$el.find('.shareWithField').val()).toEqual('bob');

			expect(showTemporaryNotificationStub.called).toEqual(false);
		});

		it('throws a notification when the ajax search lookup fails', function () {
			dialog.$el.find('.shareWithField').val('bob');

			dialog._confirmShare();

			fakeServer.requests[0].respond(500);

			expect(addShareStub.called).toEqual(false);
			expect(resendMailNotificationStub.called).toEqual(false);

			expect(dialog.$el.find('.shareWithLoading').hasClass('hidden')).toEqual(true);
			expect(dialog.$el.find('.shareWithConfirm').hasClass('hidden')).toEqual(false);
			expect(autocompleteStub.lastCall.args[0]).toEqual('enable');
			expect(dialog.$el.find('.shareWithField').prop('disabled')).toEqual(false);
			expect(dialog.$el.find('.shareWithField').val()).toEqual('bob');

			expect(showTemporaryNotificationStub.called).toEqual(false);
		});
	});
	describe('reshare permissions', function() {
		it('does not show sharing options when sharing not allowed', function() {
			shareModel.set({
				reshare: {},
				shares: [],
				permissions: OC.PERMISSION_READ
			});
			dialog.render();
			expect(dialog.$el.find('.shareWithField').prop('disabled')).toEqual(true);
		});
		it('shows reshare owner for single user share', function() {
			shareModel.set({
				reshare: {
					uid_owner: 'user1',
					displayname_owner: 'User One',
					share_type: OC.Share.SHARE_TYPE_USER
				},
				shares: [],
				permissions: OC.PERMISSION_READ
			});
			dialog.render();
			expect(dialog.$el.find('.resharerInfoView .reshare').length).toEqual(1);
			expect(dialog.$el.find('.resharerInfoView .reshare').text().trim()).toEqual('Shared with you by User One');
		});
		it('shows reshare owner for single user share', function() {
			shareModel.set({
				reshare: {
					uid_owner: 'user1',
					displayname_owner: 'User One',
					share_with: 'group2',
					share_with_displayname: 'Group Two',
					share_type: OC.Share.SHARE_TYPE_GROUP
				},
				shares: [],
				permissions: OC.PERMISSION_READ
			});
			dialog.render();
			expect(dialog.$el.find('.resharerInfoView .reshare').length).toEqual(1);
			expect(dialog.$el.find('.resharerInfoView .reshare').text().trim()).toEqual('Shared with you and the group Group Two by User One');
		});
		it('does not show reshare owner if owner is current user', function() {
			shareModel.set({
				reshare: {
					uid_owner: OC.currentUser
				},
				shares: [],
				permissions: OC.PERMISSION_READ
			});
			dialog.render();
			expect(dialog.$el.find('.resharerInfoView .reshare').length).toEqual(0);
		});
	});
});
