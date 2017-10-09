package com.enonic.starter.pwa;

import org.osgi.framework.Bundle;
import org.osgi.framework.FrameworkUtil;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.enonic.xp.content.ContentConstants;
import com.enonic.xp.content.ContentPath;
import com.enonic.xp.content.ContentService;
import com.enonic.xp.content.Content;
import com.enonic.xp.content.ContentIds;
import com.enonic.xp.content.PublishContentResult;
import com.enonic.xp.content.PushContentParams;
import com.enonic.xp.context.Context;
import com.enonic.xp.context.ContextAccessor;
import com.enonic.xp.context.ContextBuilder;
import com.enonic.xp.export.ExportService;
import com.enonic.xp.export.ImportNodesParams;
import com.enonic.xp.export.NodeImportResult;
import com.enonic.xp.index.IndexService;
import com.enonic.xp.node.NodePath;
import com.enonic.xp.security.RoleKeys;
import com.enonic.xp.security.User;
import com.enonic.xp.security.auth.AuthenticationInfo;
import com.enonic.xp.vfs.VirtualFile;
import com.enonic.xp.vfs.VirtualFiles;

@Component(immediate = true)
public class Initializer
{

    private ContentService contentService;

    private ExportService exportService;

    private IndexService indexService;

    private final Logger LOG = LoggerFactory.getLogger( Initializer.class );

    @Activate
    public void initialize()
        throws Exception
    {
        if ( this.indexService.isMaster() )
        {
            createInitContext().callWith( () -> {
                doInitialize();
                return null;
            } );
        }
    }

    private Context createInitContext()
    {
        return ContextBuilder.from( ContextAccessor.current() ).
            authInfo( AuthenticationInfo.create().principals( RoleKeys.CONTENT_MANAGER_ADMIN, RoleKeys.EVERYONE ).user( User.ANONYMOUS ).build() ).
            branch( ContentConstants.BRANCH_DRAFT ).
            repositoryId( ContentConstants.CONTENT_REPO.getId() ).
            build();
    }

    private void doInitialize()
        throws Exception
    {
        final ContentPath importPath = ContentPath.from( "/starter-pwa" );
        if ( exists( importPath ) )
        {
            return;
        }

        final Bundle bundle = FrameworkUtil.getBundle( this.getClass() );

        final VirtualFile source = VirtualFiles.from( bundle, "/import" );

        final NodeImportResult nodeImportResult = this.exportService.importNodes( ImportNodesParams.create().
            source( source ).
            targetNodePath( NodePath.create( "/content" ).build() ).
            includeNodeIds( true ).
            includePermissions( true ).
            dryRun( false ).
            build() );

        logImport( nodeImportResult );

        publishContentTree(importPath);
    }

    private void logImport( final NodeImportResult nodeImportResult )
    {
        LOG.info( "-------------------" );
        LOG.info( "Imported nodes:" );
        for ( final NodePath nodePath : nodeImportResult.getAddedNodes() )
        {
            LOG.info( nodePath.toString() );
        }

        LOG.info( "-------------------" );
        LOG.info( "Binaries:" );
        nodeImportResult.getExportedBinaries().forEach( LOG::info );

        LOG.info( "-------------------" );
        LOG.info( "Errors:" );
        for ( final NodeImportResult.ImportError importError : nodeImportResult.getImportErrors() )
        {
            LOG.info( importError.getMessage(), importError.getException() );
        }
    }

    private void publishContentTree(final ContentPath rootPath)
    {
        final Content contentRoot = this.contentService.getByPath( rootPath );

        final PublishContentResult push = this.contentService.publish( PushContentParams.create().
            contentIds( ContentIds.from( contentRoot.getId() ) ).
            target( ContentConstants.BRANCH_MASTER ).
            includeDependencies( true ).
            build() );

        LOG.info( "-------------------" );
        LOG.info( "Published nodes: ");
        if (push.getPushedContents().getSize() == 0) {
            LOG.info( "Nothing to publish" );
        }
        else {
            LOG.info( push.getPushedContents().toString(), " nodes" );
        }

    }

    private boolean exists( final ContentPath path )
    {
        try
        {
            return this.contentService.getByPath( path ) != null;
        }
        catch ( final Exception e )
        {
            return false;
        }
    }

    @Reference
    public void setExportService( final ExportService exportService )
    {
        this.exportService = exportService;
    }

    @Reference
    public void setContentService( final ContentService contentService )
    {
        this.contentService = contentService;
    }

    @Reference
    public void setIndexService( final IndexService indexService )
    {
        this.indexService = indexService;
    }
}
